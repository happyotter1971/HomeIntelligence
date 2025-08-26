import { HomeWithRelations } from '@/types';

// Utility functions for data type conversion and validation
export function toInt(value: any): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = parseInt(String(value), 10);
  return isNaN(parsed) ? undefined : parsed;
}

export function toFloat(value: any): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = parseFloat(String(value));
  return isNaN(parsed) ? undefined : parsed;
}

export function normalizeText(value: string | undefined): string {
  if (!value) return '';
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' '); // Normalize whitespace
}

export function deriveSchoolZone(address: string | undefined): string {
  if (!address) return 'Union County Public Schools';
  
  // Simple mapping based on known areas in Indian Trail/Charlotte
  const normalizedAddress = normalizeText(address);
  
  if (normalizedAddress.includes('indian trail')) return 'Union County Public Schools';
  if (normalizedAddress.includes('matthews')) return 'Charlotte-Mecklenburg Schools';
  if (normalizedAddress.includes('charlotte')) return 'Charlotte-Mecklenburg Schools';
  if (normalizedAddress.includes('mint hill')) return 'Charlotte-Mecklenburg Schools';
  
  return 'Union County Public Schools'; // Default
}

export function dedupeKey(
  mlsId: string | undefined,
  address: string | undefined,
  planName: string | undefined
): string {
  // Create a unique identifier for deduplication
  const parts = [
    mlsId || '',
    normalizeText(address),
    normalizeText(planName)
  ].filter(Boolean);
  
  return parts.join('|');
}

export interface SanitizedRecord {
  id: string;
  beds: number | undefined;
  baths: number;
  sqft: number | undefined;
  lotSqft: number | undefined;
  garageBays: number | undefined;
  yearBuilt: number;
  isNew: boolean;
  pricePpsf: number | undefined;
  subdivision: string;
  schoolZone: string;
  listingId: string;
  price: number;
  status: string;
  address: string | undefined;
  modelName: string | undefined;
  builder: string | undefined;
  community: string | undefined;
  daysOnMarket: number;
  coordinates?: [number, number];
}

export function sanitizeRecord(home: HomeWithRelations): SanitizedRecord | null {
  try {
    // Extract and sanitize core numeric fields
    const beds = toInt(home.bedrooms);
    const bathsFull = toFloat(home.bathrooms) || 0;
    const bathsHalf = toFloat(home.halfBaths) || 0;
    const baths = bathsFull + (0.5 * bathsHalf);
    const sqft = toInt(home.squareFootage);
    const lotSqft = toInt(home.lotSize);
    const garageBays = toInt(home.garageSpaces);
    
    // Validate required fields
    if (!sqft || sqft <= 0 || !home.price || home.price <= 0) {
      return null; // Invalid record
    }
    
    const yearBuilt = new Date().getFullYear(); // Assuming new construction
    const isNew = ['new_construction', 'spec', 'quick-move-in'].includes(home.status || '');
    const pricePpsf = home.price / sqft;
    
    const subdivision = normalizeText(home.community?.name);
    const schoolZone = deriveSchoolZone(home.address);
    const listingId = dedupeKey(
      home.id, // Using home ID as MLS equivalent
      home.address,
      home.modelName
    );
    
    // Calculate days on market
    const daysOnMarket = calculateDaysOnMarket(home);
    
    // Extract location data
    let coordinates: [number, number] | undefined;
    if (home.community?.city === 'Indian Trail') {
      coordinates = [35.08, -80.64]; // Indian Trail approximate coordinates
    } else if (home.community?.city === 'Charlotte') {
      coordinates = [35.2271, -80.8431]; // Charlotte coordinates
    }
    
    return {
      id: home.id,
      beds,
      baths,
      sqft,
      lotSqft,
      garageBays,
      yearBuilt,
      isNew,
      pricePpsf,
      subdivision,
      schoolZone,
      listingId,
      price: home.price,
      status: home.status || 'unknown',
      address: home.address,
      modelName: home.modelName,
      builder: home.builder?.name,
      community: home.community?.name,
      daysOnMarket,
      coordinates
    };
  } catch (error) {
    console.error('Error sanitizing record:', error);
    return null;
  }
}

function calculateDaysOnMarket(home: HomeWithRelations): number {
  if (home.createdAt) {
    const listDate = home.createdAt.toDate ? home.createdAt.toDate() : new Date(home.createdAt as any);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - listDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(1, diffDays); // Minimum 1 day
  }
  return 30; // Default estimate
}

export function isValidRecord(record: SanitizedRecord): boolean {
  // Basic validation rules
  if (!record.sqft || record.sqft < 500 || record.sqft > 10000) return false;
  if (!record.price || record.price < 50000 || record.price > 2000000) return false;
  if (!record.beds || record.beds < 1 || record.beds > 8) return false;
  if (record.baths < 1 || record.baths > 10) return false;
  if (!record.pricePpsf || record.pricePpsf < 50 || record.pricePpsf > 500) return false;
  
  return true;
}

export function distinctBy<T>(
  array: T[], 
  keyFn: (item: T) => string
): T[] {
  const seen = new Set<string>();
  return array.filter(item => {
    const key = keyFn(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function loadAndClean(homes: HomeWithRelations[]): SanitizedRecord[] {
  // Sanitize all records
  const sanitized = homes
    .map(sanitizeRecord)
    .filter((record): record is SanitizedRecord => record !== null);
  
  // Remove duplicates
  const deduped = distinctBy(sanitized, record => record.listingId);
  
  // Apply validation filter
  return deduped.filter(isValidRecord);
}