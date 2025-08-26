import { HomeWithRelations } from '@/types';
import { getHomes } from '@/lib/firestore';
import { SanitizedRecord, sanitizeRecord, isValidRecord, loadAndClean } from './data-sanitization';
import { getBestDistance, isSameMarketArea, LocationData } from './geo-utils';

export interface ComparableCriteria {
  city: string;
  zipCode: string;
  bedrooms: number;
  squareFeet: number;
  excludeId: string;
  maxDistance?: number; // Maximum distance in miles
  priceRange?: { min: number; max: number }; // Price filtering
}

export interface ComparableScore {
  home: HomeWithRelations;
  sanitized: SanitizedRecord;
  score: number;
  factors: {
    locationScore: number;
    sizeScore: number;
    statusScore: number;
    ppsfScore: number;
    timeScore: number;
  };
  distance: number;
}

export async function findComparableHomes(
  criteria: ComparableCriteria,
  limit: number = 10
): Promise<HomeWithRelations[]> {
  // Get all homes and clean the data
  const allHomes = await getHomes();
  const cleanedHomes = loadAndClean(allHomes);
  
  // Find the subject home's sanitized record
  const subjectHome = allHomes.find(h => h.id === criteria.excludeId);
  if (!subjectHome) {
    throw new Error('Subject home not found');
  }
  
  const subjectSanitized = sanitizeRecord(subjectHome);
  if (!subjectSanitized) {
    throw new Error('Subject home failed sanitization');
  }
  
  // Score and rank potential comparables
  const scoredComparables = cleanedHomes
    .filter(record => record.id !== criteria.excludeId) // Exclude subject
    .map(sanitized => {
      const originalHome = allHomes.find(h => h.id === sanitized.id)!;
      return scoreComparable(sanitized, originalHome, subjectSanitized, subjectHome, criteria);
    })
    .filter(scored => scored.score > 0) // Only valid comparables
    .sort((a, b) => b.score - a.score) // Highest score first
    .slice(0, limit);
  
  return scoredComparables.map(sc => sc.home);
}

function scoreComparable(
  comparable: SanitizedRecord,
  comparableHome: HomeWithRelations,
  subject: SanitizedRecord,
  subjectHome: HomeWithRelations,
  criteria: ComparableCriteria
): ComparableScore {
  const subjectLocation: LocationData = {
    city: subjectHome.community?.city,
    zipCode: subjectHome.community?.zipCode,
    community: subjectHome.community?.name,
    coordinates: subject.coordinates ? 
      { lat: subject.coordinates[0], lng: subject.coordinates[1] } : undefined
  };
  
  const comparableLocation: LocationData = {
    city: comparableHome.community?.city,
    zipCode: comparableHome.community?.zipCode,
    community: comparableHome.community?.name,
    coordinates: comparable.coordinates ? 
      { lat: comparable.coordinates[0], lng: comparable.coordinates[1] } : undefined
  };
  
  const distance = getBestDistance(subjectLocation, comparableLocation);
  
  // Calculate individual scoring factors
  const locationScore = calculateLocationScore(subjectLocation, comparableLocation, distance, criteria);
  const sizeScore = calculateSizeScore(comparable, subject);
  const statusScore = calculateStatusScore(comparable.status);
  const ppsfScore = calculatePpsfScore(comparable, subject);
  const timeScore = calculateTimeScore(comparable.daysOnMarket);
  
  // Weighted total score
  const totalScore = (
    locationScore * 0.25 +
    sizeScore * 0.25 +
    statusScore * 0.20 +
    ppsfScore * 0.20 +
    timeScore * 0.10
  );
  
  return {
    home: comparableHome,
    sanitized: comparable,
    score: Math.max(0, totalScore),
    factors: {
      locationScore,
      sizeScore,
      statusScore,
      ppsfScore,
      timeScore
    },
    distance
  };
}

function calculateLocationScore(
  subjectLocation: LocationData,
  comparableLocation: LocationData,
  distance: number,
  criteria: ComparableCriteria
): number {
  // Check distance limits
  const maxDistance = criteria.maxDistance || 15;
  if (distance > maxDistance) return 0;
  
  // Same market area bonus
  if (isSameMarketArea(subjectLocation, comparableLocation)) {
    if (distance <= 1) return 100;
    if (distance <= 3) return 95;
    if (distance <= 5) return 85;
  }
  
  // Distance penalty curve
  if (distance <= 1) return 90;
  if (distance <= 3) return 80;
  if (distance <= 5) return 70;
  if (distance <= 10) return 50;
  if (distance <= 15) return 25;
  
  return 0;
}

function calculateSizeScore(comparable: SanitizedRecord, subject: SanitizedRecord): number {
  if (!comparable.sqft || !subject.sqft) return 0;
  
  // Square footage similarity
  const sqftDiff = Math.abs(comparable.sqft - subject.sqft);
  const sqftDiffPercent = sqftDiff / subject.sqft;
  
  // Bedroom similarity
  const bedDiff = Math.abs((comparable.beds || 0) - (subject.beds || 0));
  
  // Reject if too different
  if (sqftDiffPercent > 0.20 || bedDiff > 1) return 0;
  
  let score = 100;
  
  // Square footage penalty
  if (sqftDiffPercent > 0.10) score -= 20;
  else if (sqftDiffPercent > 0.05) score -= 10;
  
  // Bedroom penalty
  if (bedDiff === 1) score -= 15;
  
  // Bathroom similarity bonus
  const bathDiff = Math.abs(comparable.baths - subject.baths);
  if (bathDiff <= 0.5) score += 5;
  else if (bathDiff > 1) score -= 10;
  
  return Math.max(0, score);
}

function calculateStatusScore(status: string): number {
  // Prioritize by reliability of price data
  const statusScores: { [status: string]: number } = {
    'sold': 100,        // Best - actual market price
    'pending': 90,      // Very good - accepted offer
    'available': 75,    // Good - current listing
    'quick-move-in': 70,// Good - move-in ready
    'spec': 60,         // Okay - completed speculation
    'under-construction': 50, // Weaker - still building
    'to-be-built': 40,  // Weakest - future construction
    'unknown': 20
  };
  
  return statusScores[status] || 20;
}

function calculatePpsfScore(comparable: SanitizedRecord, subject: SanitizedRecord): number {
  if (!comparable.pricePpsf || !subject.pricePpsf) return 0;
  
  const ppsfDiff = Math.abs(comparable.pricePpsf - subject.pricePpsf);
  const ppsfDiffPercent = ppsfDiff / subject.pricePpsf;
  
  // Reject extreme outliers
  if (ppsfDiffPercent > 0.30) return 0;
  
  // Score based on similarity
  if (ppsfDiffPercent <= 0.05) return 100;
  if (ppsfDiffPercent <= 0.10) return 85;
  if (ppsfDiffPercent <= 0.15) return 70;
  if (ppsfDiffPercent <= 0.20) return 50;
  if (ppsfDiffPercent <= 0.25) return 30;
  
  return 15;
}

function calculateTimeScore(daysOnMarket: number): number {
  // Prefer recent listings for current market conditions
  if (daysOnMarket <= 30) return 100;
  if (daysOnMarket <= 60) return 90;
  if (daysOnMarket <= 90) return 80;
  if (daysOnMarket <= 180) return 60;
  if (daysOnMarket <= 365) return 40;
  
  return 20; // Older than a year
}