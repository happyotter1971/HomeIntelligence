import { HomeWithRelations } from '@/types';
import { SubjectProperty, ComparableProperty } from '@/lib/openai/types';
import { sanitizeRecord, SanitizedRecord } from './data-sanitization';
import { getBestDistance, getCoordinates, LocationData } from './geo-utils';
import { detectOutliers, calculateMarketBounds } from './outlier-detection';

export function prepareSubjectProperty(home: HomeWithRelations): SubjectProperty {
  // Use sanitized data for consistency
  const sanitized = sanitizeRecord(home);
  
  if (!sanitized) {
    throw new Error('Unable to sanitize subject property data');
  }
  
  // Get proper coordinates
  const locationData: LocationData = {
    city: home.community?.city,
    zipCode: home.community?.zipCode,
    community: home.community?.name,
    coordinates: sanitized.coordinates ? 
      { lat: sanitized.coordinates[0], lng: sanitized.coordinates[1] } : undefined
  };
  
  const coordinates = getCoordinates(locationData);
  const finalCoords: [number, number] = coordinates ? 
    [coordinates.lat, coordinates.lng] : [35.08, -80.64];
  
  return {
    address: home.address || 'Address not available',
    city: home.community?.city || 'Indian Trail',
    county: getCountyFromLocation(home.community?.city, home.community?.zipCode),
    zip: home.community?.zipCode || '28079',
    community: home.community?.name || '',
    builder: home.builder?.name || '',
    plan: home.modelName || undefined,
    status: home.status || 'quick-move-in',
    list_price: home.price,
    beds: home.bedrooms,
    baths: sanitized.baths,
    half_baths: home.halfBaths || 0,
    heated_sqft: home.squareFootage,
    garage_spaces: home.garageSpaces || 0,
    lot_size: home.lotSize || undefined,
    year_built: sanitized.yearBuilt,
    coordinates: finalCoords,
    school_district: sanitized.schoolZone,
    commute_pins: getCommutePins(finalCoords),
    price_ppsf: sanitized.pricePpsf,
    days_on_market: sanitized.daysOnMarket,
    is_new_construction: sanitized.isNew
  };
}

export function prepareComparableProperty(
  home: HomeWithRelations,
  subjectHome: HomeWithRelations
): ComparableProperty {
  const subject = prepareSubjectProperty(home);
  
  // Calculate accurate distance using geographic utilities
  const subjectLocation: LocationData = {
    city: subjectHome.community?.city,
    zipCode: subjectHome.community?.zipCode,
    community: subjectHome.community?.name
  };
  
  const comparableLocation: LocationData = {
    city: home.community?.city,
    zipCode: home.community?.zipCode,
    community: home.community?.name
  };
  
  const distance = getBestDistance(subjectLocation, comparableLocation);
  
  return {
    ...subject,
    distance_miles: distance,
    days_on_market: subject.days_on_market || calculateDaysOnMarket(home),
    pending_flag: home.status === 'pending',
    close_price: home.status === 'sold' ? home.price : undefined
  };
}

export function prepareAndValidateComparables(
  homes: HomeWithRelations[],
  subjectHome: HomeWithRelations
): {
  validComparables: ComparableProperty[];
  rejectedCount: number;
  outlierAnalysis: any[];
} {
  // Sanitize all homes first
  const sanitizedData = homes
    .map(home => ({ home, sanitized: sanitizeRecord(home) }))
    .filter(({ sanitized }) => sanitized !== null) as Array<{ 
      home: HomeWithRelations; 
      sanitized: SanitizedRecord 
    }>;
  
  // Calculate market bounds for outlier detection
  const allSanitized = sanitizedData.map(d => d.sanitized);
  const marketBounds = calculateMarketBounds(allSanitized);
  
  // Detect outliers and filter
  const analysisResults = sanitizedData.map(({ home, sanitized }) => {
    const outlierAnalysis = detectOutliers(sanitized, marketBounds);
    return { home, sanitized, outlierAnalysis };
  });
  
  // Keep only homes that pass outlier detection
  const validHomes = analysisResults.filter(
    ({ outlierAnalysis }) => outlierAnalysis.recommendation !== 'exclude'
  );
  
  // Prepare comparable properties
  const validComparables = validHomes.map(({ home }) => 
    prepareComparableProperty(home, subjectHome)
  );
  
  return {
    validComparables,
    rejectedCount: homes.length - validHomes.length,
    outlierAnalysis: analysisResults.map(r => ({
      homeId: r.home.id,
      address: r.home.address,
      analysis: r.outlierAnalysis
    }))
  };
}

function getCountyFromLocation(city?: string, zipCode?: string): string {
  // Map cities and ZIP codes to their counties
  const countyMap: { [key: string]: string } = {
    'indian trail': 'Union',
    'matthews': 'Mecklenburg',
    'charlotte': 'Mecklenburg',
    'mint hill': 'Mecklenburg',
    'stallings': 'Union',
    'weddington': 'Union',
    'waxhaw': 'Union',
    'wesley chapel': 'Union',
    '28079': 'Union',
    '28104': 'Mecklenburg',
    '28110': 'Mecklenburg',
    '28078': 'Union',
    '28173': 'Union',
    '28105': 'Union',
    '28227': 'Mecklenburg'
  };
  
  if (city) {
    const county = countyMap[city.toLowerCase()];
    if (county) return county;
  }
  
  if (zipCode) {
    const county = countyMap[zipCode];
    if (county) return county;
  }
  
  return 'Union'; // Default for Indian Trail area
}

function getCommutePins(coordinates: [number, number]): Array<{ location: string; distance_miles: number }> {
  const [lat, lng] = coordinates;
  
  // Major employment centers in the Charlotte area
  const centers = [
    { location: 'Uptown Charlotte', coords: [35.2271, -80.8431] },
    { location: 'SouthPark', coords: [35.1584, -80.8414] },
    { location: 'Ballantyne', coords: [35.0513, -80.8419] },
    { location: 'University Area', coords: [35.3074, -80.7336] },
    { location: 'Concord Mills', coords: [35.3501, -80.7218] }
  ];
  
  return centers.map(center => {
    const distance = calculateDistance(
      { lat, lng },
      { lat: center.coords[0], lng: center.coords[1] }
    );
    
    return {
      location: center.location,
      distance_miles: Math.round(distance * 10) / 10 // Round to 1 decimal
    };
  });
}

function calculateDistance(
  coord1: { lat: number; lng: number },
  coord2: { lat: number; lng: number }
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRadians(coord2.lat - coord1.lat);
  const dLng = toRadians(coord2.lng - coord1.lng);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(coord1.lat)) * Math.cos(toRadians(coord2.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
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