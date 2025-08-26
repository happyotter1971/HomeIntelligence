// Data hygiene and sanitization for deterministic pricing analysis

import { RecordRaw, RecordClean, ListingStatus } from './types';

export function sanitize(record: RecordRaw): RecordClean | null {
  try {
    // Numeric coercion with validation
    const price = toNumber(record.price);
    const sqft = toNumber(record.sqft);
    const beds = toNumber(record.beds);
    const bathsFull = toNumber(record.baths_full) || 0;
    const bathsHalf = toNumber(record.baths_half) || 0;
    const garage = toNumber(record.garage) || 0;
    const lotSqft = toNumber(record.lot_sqft);
    const yearBuilt = toNumber(record.year_built) || new Date().getFullYear();
    
    // Basic validation
    if (!price || price <= 0) return null;
    if (!sqft || sqft <= 0) return null;
    if (!beds || beds <= 0) return null;
    
    // Calculate derived fields
    const baths = bathsFull + 0.5 * bathsHalf;
    const pricePpsf = price / sqft;
    const isNew = isNewConstruction(record.status, yearBuilt);
    
    // Normalize text fields
    const subdivision = normalizeText(record.subdivision || record.community || '');
    const schoolZone = normalizeSchoolZone(record.school_zone, record.address);
    
    // Create dedupe ID
    const dedupeId = createDedupeId(record.mls_id, record.address, record.plan_name);
    
    // Handle dates
    const listDate = parseDate(record.list_date) || new Date();
    const soldDate = parseDate(record.sold_date);
    const daysOnMarket = calculateDaysOnMarket(listDate, soldDate);
    const monthIndex = getMonthIndex(listDate);
    
    // Normalize status
    const status = normalizeStatus(record.status);
    
    // Property type normalization
    const propertyType = normalizePropertyType(record.property_type);
    
    return {
      id: record.id,
      price,
      sqft,
      beds,
      baths,
      garage,
      lot_sqft: lotSqft,
      year_built: yearBuilt,
      is_new: isNew,
      price_ppsf: pricePpsf,
      status,
      address: record.address,
      subdivision,
      school_zone: schoolZone,
      dedupe_id: dedupeId,
      lat: record.lat,
      lng: record.lng,
      list_date: listDate,
      sold_date: soldDate,
      days_on_market: daysOnMarket,
      month_index: monthIndex,
      property_type: propertyType
    };
  } catch (error) {
    console.error('Error sanitizing record:', error);
    return null;
  }
}

export function dedupe(records: RecordClean[]): RecordClean[] {
  const seen = new Set<string>();
  return records.filter(record => {
    if (seen.has(record.dedupe_id)) {
      return false;
    }
    seen.add(record.dedupe_id);
    return true;
  });
}

// Utility functions

function toNumber(value: any): number | undefined {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = typeof value === 'number' ? value : parseFloat(String(value));
  return isNaN(parsed) || !isFinite(parsed) ? undefined : parsed;
}

function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' '); // Normalize whitespace
}

function normalizeSchoolZone(schoolZone?: string, address?: string): string {
  if (schoolZone && schoolZone.trim()) {
    return normalizeText(schoolZone);
  }
  
  // Derive from address if not provided
  if (address) {
    const normalizedAddress = normalizeText(address);
    
    if (normalizedAddress.includes('indian trail') || normalizedAddress.includes('union')) {
      return 'union county public schools';
    }
    if (normalizedAddress.includes('charlotte') || normalizedAddress.includes('matthews') || normalizedAddress.includes('mint hill')) {
      return 'charlotte mecklenburg schools';
    }
  }
  
  return 'union county public schools'; // Default
}

function createDedupeId(mlsId?: string, address?: string, planName?: string): string {
  const parts = [
    mlsId || '',
    normalizeText(address || ''),
    normalizeText(planName || '')
  ].filter(Boolean);
  
  return parts.join('|') || `unknown_${Math.random().toString(36).substr(2, 9)}`;
}

function parseDate(dateValue: any): Date | undefined {
  if (!dateValue) return undefined;
  
  if (dateValue instanceof Date) return dateValue;
  
  const parsed = new Date(dateValue);
  return isNaN(parsed.getTime()) ? undefined : parsed;
}

function calculateDaysOnMarket(listDate: Date, soldDate?: Date): number {
  const endDate = soldDate || new Date();
  const timeDiff = endDate.getTime() - listDate.getTime();
  const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
  return Math.max(1, daysDiff); // Minimum 1 day
}

function getMonthIndex(date: Date): number {
  return date.getFullYear() * 12 + date.getMonth() + 1;
}

function isNewConstruction(status?: string, yearBuilt?: number): boolean {
  const currentYear = new Date().getFullYear();
  const isRecentConstruction = yearBuilt && yearBuilt >= currentYear - 1;
  
  const newStatuses = ['spec', 'quick-move-in', 'under-construction', 'to-be-built'];
  const statusIsNew = status && newStatuses.includes(normalizeStatus(status));
  
  return Boolean(isRecentConstruction || statusIsNew);
}

function normalizeStatus(status?: string): ListingStatus {
  if (!status) return 'active';
  
  const normalized = status.toLowerCase().trim();
  
  // Map various status strings to our standard types
  if (['sold', 'closed'].includes(normalized)) return 'sold';
  if (['pending', 'under contract', 'contract pending'].includes(normalized)) return 'pending';
  if (['active', 'available', 'for sale'].includes(normalized)) return 'active';
  if (['spec', 'completed', 'inventory'].includes(normalized)) return 'spec';
  if (['quick-move-in', 'quick move in', 'move in ready', 'qmi'].includes(normalized)) return 'quick-move-in';
  if (['under construction', 'under-construction', 'building'].includes(normalized)) return 'under-construction';
  if (['to be built', 'to-be-built', 'pre-construction'].includes(normalized)) return 'to-be-built';
  
  return 'active'; // Default fallback
}

function normalizePropertyType(propertyType?: string): string {
  if (!propertyType) return 'single-family';
  
  const normalized = normalizeText(propertyType);
  
  if (normalized.includes('single') || normalized.includes('detached')) return 'single-family';
  if (normalized.includes('townhome') || normalized.includes('townhouse') || normalized.includes('town')) return 'townhome';
  if (normalized.includes('condo') || normalized.includes('condominium')) return 'condo';
  if (normalized.includes('duplex')) return 'duplex';
  if (normalized.includes('villa')) return 'villa';
  
  return 'single-family'; // Default
}

// Validation functions

export function isValidRecord(record: RecordClean): boolean {
  // Price validation
  if (record.price < 50000 || record.price > 2000000) return false;
  
  // Square footage validation  
  if (record.sqft < 500 || record.sqft > 10000) return false;
  
  // Bedroom validation
  if (record.beds < 1 || record.beds > 8) return false;
  
  // Bathroom validation
  if (record.baths < 1 || record.baths > 10) return false;
  
  // Price per square foot validation
  if (record.price_ppsf < 50 || record.price_ppsf > 500) return false;
  
  // Year validation
  const currentYear = new Date().getFullYear();
  if (record.year_built < 1900 || record.year_built > currentYear + 2) return false;
  
  // Days on market validation
  if (record.days_on_market < 0 || record.days_on_market > 3650) return false; // Max 10 years
  
  return true;
}

export function loadAndClean(records: RecordRaw[]): RecordClean[] {
  // Step 1: Sanitize all records
  const sanitized = records
    .map(sanitize)
    .filter((record): record is RecordClean => record !== null);
  
  // Step 2: Remove duplicates
  const deduped = dedupe(sanitized);
  
  // Step 3: Apply validation filter
  const validated = deduped.filter(isValidRecord);
  
  console.log(`Data cleaning: ${records.length} raw → ${sanitized.length} sanitized → ${deduped.length} deduped → ${validated.length} validated`);
  
  return validated;
}