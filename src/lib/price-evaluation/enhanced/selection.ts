// Iterative comparable selection with distance-based relaxation

import { Subject, RecordClean, CompSelectionCriteria } from './types';

export interface ComparisonResult {
  comparables: RecordClean[];
  criteriaUsed: 'strict' | 'relaxed_time' | 'relaxed_radius' | 'relaxed_sqft' | 'relaxed_beds' | 'relaxed_year' | 'fallback' | 'insufficient';
  totalCandidates: number;
}

export function findComps(subject: Subject, pool: RecordClean[], minComps: number = 3): ComparisonResult {
  // Remove subject from pool
  const candidates = pool.filter(comp => comp.id !== subject.id);
  
  // Define criteria tiers with iterative relaxation
  const criteriaTiers = [
    {
      name: 'strict' as const,
      sameSubdivisionOrSchool: true,
      radiusMiles: 1,
      daysLookback: 90,
      bedsTolerancePlus: 1,
      bedsToleranceMinus: 1,
      sqftTolerancePct: 0.15,
      yearTolerance: 5,
      propertyTypeMatch: true
    },
    {
      name: 'relaxed_time' as const,
      sameSubdivisionOrSchool: true,
      radiusMiles: 1,
      daysLookback: 180,
      bedsTolerancePlus: 1,
      bedsToleranceMinus: 1,
      sqftTolerancePct: 0.15,
      yearTolerance: 5,
      propertyTypeMatch: true
    },
    {
      name: 'relaxed_radius' as const,
      sameSubdivisionOrSchool: false,
      radiusMiles: 2,
      daysLookback: 180,
      bedsTolerancePlus: 1,
      bedsToleranceMinus: 1,
      sqftTolerancePct: 0.15,
      yearTolerance: 5,
      propertyTypeMatch: true
    },
    {
      name: 'relaxed_sqft' as const,
      sameSubdivisionOrSchool: false,
      radiusMiles: 2,
      daysLookback: 180,
      bedsTolerancePlus: 1,
      bedsToleranceMinus: 1,
      sqftTolerancePct: 0.20,
      yearTolerance: 5,
      propertyTypeMatch: true
    },
    {
      name: 'relaxed_beds' as const,
      sameSubdivisionOrSchool: false,
      radiusMiles: 2,
      daysLookback: 180,
      bedsTolerancePlus: 2,
      bedsToleranceMinus: 2,
      sqftTolerancePct: 0.20,
      yearTolerance: 7,
      propertyTypeMatch: true
    },
    {
      name: 'relaxed_year' as const,
      sameSubdivisionOrSchool: false,
      radiusMiles: 2,
      daysLookback: 180,
      bedsTolerancePlus: 2,
      bedsToleranceMinus: 2,
      sqftTolerancePct: 0.20,
      yearTolerance: 10,
      propertyTypeMatch: false
    }
  ];
  
  // Try each tier until we get enough comparables
  for (const criteria of criteriaTiers) {
    const comps = filterComparables(subject, candidates, criteria);
    
    if (comps.length >= minComps) {
      // Sort by quality and return top matches
      const rankedComps = rankComparables(subject, comps);
      return {
        comparables: rankedComps.slice(0, Math.min(15, rankedComps.length)), // Max 15 comps
        criteriaUsed: criteria.name,
        totalCandidates: candidates.length
      };
    }
  }
  
  // If still insufficient, return what we have
  const fallbackComps = filterComparables(subject, candidates, criteriaTiers[criteriaTiers.length - 1]);
  const rankedFallback = rankComparables(subject, fallbackComps);
  
  // Check if fallback actually has enough comparables
  const fallbackResult = rankedFallback.slice(0, Math.min(15, rankedFallback.length));
  
  return {
    comparables: fallbackResult,
    criteriaUsed: fallbackResult.length >= minComps ? 'fallback' : 'insufficient',
    totalCandidates: candidates.length
  };
}

function filterComparables(subject: Subject, candidates: RecordClean[], criteria: any): RecordClean[] {
  const now = new Date();
  const cutoffDate = new Date(now.getTime() - (criteria.daysLookback * 24 * 60 * 60 * 1000));
  
  return candidates.filter(comp => {
    // Location filter
    if (criteria.sameSubdivisionOrSchool) {
      const sameSubdivision = comp.subdivision === subject.subdivision;
      const sameSchoolZone = comp.school_zone === subject.school_zone;
      if (!sameSubdivision && !sameSchoolZone) return false;
    } else {
      // Use radius filter
      const distance = milesBetween(
        { lat: subject.lat, lng: subject.lng },
        { lat: comp.lat, lng: comp.lng }
      );
      if (distance > criteria.radiusMiles) return false;
    }
    
    // Time filter
    if (comp.list_date < cutoffDate) return false;
    
    // Bedroom filter
    const bedDiff = comp.beds - subject.beds;
    if (bedDiff > criteria.bedsTolerancePlus || bedDiff < -criteria.bedsToleranceMinus) return false;
    
    // Square footage filter
    const sqftDiff = Math.abs(comp.sqft - subject.sqft) / subject.sqft;
    if (sqftDiff > criteria.sqftTolerancePct) return false;
    
    // Year filter
    const yearDiff = Math.abs(comp.year_built - subject.year_built);
    if (yearDiff > criteria.yearTolerance) return false;
    
    // Property type filter
    if (criteria.propertyTypeMatch && comp.property_type !== subject.property_type) return false;
    
    return true;
  });
}

function rankComparables(subject: Subject, comparables: RecordClean[]): RecordClean[] {
  return comparables
    .map(comp => ({
      comp,
      score: calculateCompScore(subject, comp)
    }))
    .sort((a, b) => b.score - a.score) // Higher score first
    .map(item => item.comp);
}

function calculateCompScore(subject: Subject, comp: RecordClean): number {
  let score = 100;
  
  // Status preference (sold > pending > active)
  const statusScores = {
    'sold': 100,
    'pending': 90,
    'spec': 85,
    'quick-move-in': 80,
    'active': 70,
    'under-construction': 60,
    'to-be-built': 50
  };
  const statusScore = statusScores[comp.status] || 50;
  
  // Location similarity
  let locationScore = 100;
  if (comp.subdivision === subject.subdivision) {
    locationScore = 100;
  } else if (comp.school_zone === subject.school_zone) {
    locationScore = 90;
  } else {
    const distance = milesBetween(
      { lat: subject.lat, lng: subject.lng },
      { lat: comp.lat, lng: comp.lng }
    );
    locationScore = Math.max(50, 100 - (distance * 10)); // Penalize distance
  }
  
  // Size similarity
  const sqftDiff = Math.abs(comp.sqft - subject.sqft) / subject.sqft;
  const sizeScore = Math.max(50, 100 - (sqftDiff * 200)); // Penalize size difference
  
  // Bedroom similarity
  const bedDiff = Math.abs(comp.beds - subject.beds);
  const bedScore = Math.max(80, 100 - (bedDiff * 10));
  
  // Time recency (prefer recent listings)
  const daysDiff = comp.days_on_market;
  const timeScore = Math.max(60, 100 - (daysDiff / 30)); // Decline over 30 days
  
  // Price similarity (avoid extreme outliers)
  const priceDiff = Math.abs(comp.price_ppsf - (subject.price / subject.sqft)) / (subject.price / subject.sqft);
  const priceScore = Math.max(50, 100 - (priceDiff * 100));
  
  // Weighted combination
  score = (
    statusScore * 0.25 +
    locationScore * 0.25 +
    sizeScore * 0.20 +
    bedScore * 0.10 +
    timeScore * 0.10 +
    priceScore * 0.10
  );
  
  return score;
}

export function milesBetween(
  coord1: { lat?: number; lng?: number },
  coord2: { lat?: number; lng?: number }
): number {
  // If coordinates are missing, use default assumptions
  if (!coord1.lat || !coord1.lng || !coord2.lat || !coord2.lng) {
    // If same subdivision/school, assume close
    return 0.5;
  }
  
  // Haversine formula
  const R = 3959; // Earth's radius in miles
  const dLat = toRadians(coord2.lat - coord1.lat);
  const dLng = toRadians(coord2.lng - coord1.lng);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(coord1.lat)) * Math.cos(toRadians(coord2.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// Feature distance calculation for confidence scoring
export function featureDistance(subject: Subject, comp: RecordClean): number {
  const bedsDiff = Math.abs(comp.beds - subject.beds) / Math.max(subject.beds, 1);
  const bathsDiff = Math.abs(comp.baths - subject.baths) / Math.max(subject.baths, 1);
  const sqftDiff = Math.abs(comp.sqft - subject.sqft) / subject.sqft;
  const ageDiff = Math.abs(comp.year_built - subject.year_built) / Math.max(subject.year_built - 1900, 1);
  
  const geoDist = milesBetween(
    { lat: subject.lat, lng: subject.lng },
    { lat: comp.lat, lng: comp.lng }
  );
  const geoScore = Math.min(1, geoDist / 2); // Cap at 1 for 2+ miles
  
  const timeDist = Math.min(1, comp.days_on_market / 180); // Cap at 1 for 180+ days
  
  // Weighted feature distance (0 = identical, 1 = very different)
  const distance = (
    bedsDiff * 0.2 +
    bathsDiff * 0.2 +
    sqftDiff * 0.3 +
    ageDiff * 0.1 +
    geoScore * 0.1 +
    timeDist * 0.1
  );
  
  return Math.min(1, distance); // Cap at 1
}