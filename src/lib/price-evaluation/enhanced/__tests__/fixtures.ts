// Test fixtures for enhanced pricing evaluation system

import { RecordRaw, RecordClean } from '../types';

// Sample subject properties for testing
export const subjectProperties: Record<string, RecordRaw> = {
  typical: {
    id: 'subject-1',
    price: 425000,
    sqft: 2050,
    beds: 4,
    baths_full: 2,
    baths_half: 1,
    garage: 2,
    lot_sqft: 7500,
    year_built: 2024,
    status: 'quick-move-in',
    address: '123 Main St, Indian Trail, NC',
    subdivision: 'Meadowbrook',
    school_zone: 'Union County Public Schools',
    mls_id: 'MLS123',
    plan_name: 'Ashford',
    lat: 35.08,
    lng: -80.64,
    list_date: new Date('2024-01-15'),
    property_type: 'single-family',
    builder: 'Dream Finders Homes',
    community: 'Meadowbrook'
  },
  
  highEnd: {
    id: 'subject-2',
    price: 695000,
    sqft: 3200,
    beds: 5,
    baths_full: 4,
    baths_half: 1,
    garage: 3,
    lot_sqft: 10000,
    year_built: 2024,
    status: 'spec',
    address: '456 Oak Ave, Indian Trail, NC',
    subdivision: 'Preston Hills',
    school_zone: 'Union County Public Schools',
    lat: 35.09,
    lng: -80.65,
    list_date: new Date('2024-02-01'),
    property_type: 'single-family'
  },
  
  compact: {
    id: 'subject-3',
    price: 315000,
    sqft: 1650,
    beds: 3,
    baths_full: 2,
    baths_half: 0,
    garage: 2,
    year_built: 2023,
    status: 'available',
    address: '789 Pine St, Indian Trail, NC',
    subdivision: 'Willow Creek',
    school_zone: 'Union County Public Schools',
    lat: 35.07,
    lng: -80.63,
    list_date: new Date('2024-01-20'),
    property_type: 'single-family'
  }
};

// Market data with various scenarios
export const marketData: RecordRaw[] = [
  // Tight market scenario - similar properties
  {
    id: 'comp-1',
    price: 415000,
    sqft: 2000,
    beds: 4,
    baths_full: 2,
    baths_half: 1,
    garage: 2,
    year_built: 2023,
    status: 'sold',
    address: '100 Elm St, Indian Trail, NC',
    subdivision: 'Meadowbrook',
    school_zone: 'Union County Public Schools',
    lat: 35.081,
    lng: -80.641,
    list_date: new Date('2023-11-01'),
    sold_date: new Date('2023-11-15'),
    property_type: 'single-family'
  },
  {
    id: 'comp-2', 
    price: 420000,
    sqft: 2075,
    beds: 4,
    baths_full: 2,
    baths_half: 1,
    garage: 2,
    year_built: 2023,
    status: 'sold',
    address: '102 Elm St, Indian Trail, NC',
    subdivision: 'Meadowbrook',
    school_zone: 'Union County Public Schools',
    lat: 35.082,
    lng: -80.642,
    list_date: new Date('2023-12-01'),
    sold_date: new Date('2023-12-10'),
    property_type: 'single-family'
  },
  {
    id: 'comp-3',
    price: 410000,
    sqft: 1950,
    beds: 4,
    baths_full: 2,
    baths_half: 1,
    garage: 2,
    year_built: 2024,
    status: 'sold',
    address: '104 Elm St, Indian Trail, NC',
    subdivision: 'Meadowbrook',
    school_zone: 'Union County Public Schools',
    lat: 35.083,
    lng: -80.643,
    list_date: new Date('2023-10-15'),
    sold_date: new Date('2023-11-01'),
    property_type: 'single-family'
  },
  
  // Wider market with more variation
  {
    id: 'comp-4',
    price: 450000,
    sqft: 2200,
    beds: 4,
    baths_full: 3,
    baths_half: 0,
    garage: 2,
    year_built: 2023,
    status: 'pending',
    address: '200 Oak St, Indian Trail, NC',
    subdivision: 'Preston Hills',
    school_zone: 'Union County Public Schools',
    lat: 35.09,
    lng: -80.65,
    list_date: new Date('2024-01-01'),
    property_type: 'single-family'
  },
  {
    id: 'comp-5',
    price: 395000,
    sqft: 1900,
    beds: 3,
    baths_full: 2,
    baths_half: 1,
    garage: 2,
    year_built: 2023,
    status: 'sold',
    address: '300 Pine Ave, Indian Trail, NC',
    subdivision: 'Willow Creek',
    school_zone: 'Union County Public Schools',
    lat: 35.07,
    lng: -80.63,
    list_date: new Date('2023-09-01'),
    sold_date: new Date('2023-09-20'),
    property_type: 'single-family'
  },
  
  // Outliers for robustness testing
  {
    id: 'outlier-1',
    price: 650000,
    sqft: 2100,
    beds: 4,
    baths_full: 3,
    baths_half: 1,
    garage: 3,
    year_built: 2024,
    status: 'active',
    address: '999 Luxury Lane, Indian Trail, NC',
    subdivision: 'Premium Estates',
    school_zone: 'Union County Public Schools',
    lat: 35.10,
    lng: -80.66,
    list_date: new Date('2024-01-10'),
    property_type: 'single-family'
  },
  {
    id: 'outlier-2',
    price: 275000,
    sqft: 1800,
    beds: 3,
    baths_full: 2,
    baths_half: 0,
    garage: 1,
    year_built: 2020,
    status: 'sold',
    address: '111 Budget St, Indian Trail, NC',
    subdivision: 'Starter Homes',
    school_zone: 'Union County Public Schools',
    lat: 35.06,
    lng: -80.62,
    list_date: new Date('2023-08-01'),
    sold_date: new Date('2023-08-15'),
    property_type: 'single-family'
  },
  
  // Different property types
  {
    id: 'townhome-1',
    price: 385000,
    sqft: 1850,
    beds: 3,
    baths_full: 2,
    baths_half: 1,
    garage: 2,
    year_built: 2023,
    status: 'sold',
    address: '500 Townhome Way, Indian Trail, NC',
    subdivision: 'Urban Village',
    school_zone: 'Union County Public Schools',
    lat: 35.085,
    lng: -80.645,
    list_date: new Date('2023-11-01'),
    sold_date: new Date('2023-11-20'),
    property_type: 'townhome'
  }
];

// Expected results for validation
export const expectedResults = {
  tightMarket: {
    classification: 'Market Fair',
    confidenceRange: [70, 90],
    medianPpsfRange: [200, 215],
    compCountMin: 3
  },
  
  belowMarket: {
    classification: 'Below',
    confidenceRange: [60, 85],
    medianPpsfRange: [210, 230]
  },
  
  aboveMarket: {
    classification: 'Above', 
    confidenceRange: [65, 85],
    medianPpsfRange: [190, 210]
  }
};

// Statistical test data
export const statisticalTestData = {
  tightMarket: [204, 205, 206, 205, 205, 206], // Low variance
  normalMarket: [195, 205, 215, 200, 210, 208], // Normal variance  
  volatileMarket: [180, 220, 190, 240, 200, 210], // High variance
  withOutliers: [200, 205, 203, 260, 202, 199] // Contains outlier at 260
};

// Hedonic model test data
export const hedonicTestData: RecordClean[] = [
  {
    id: 'train-1',
    price: 400000,
    sqft: 2000,
    beds: 4,
    baths: 2.5,
    garage: 2,
    year_built: 2023,
    is_new: true,
    price_ppsf: 200,
    status: 'sold',
    subdivision: 'test subdivision',
    school_zone: 'test school',
    dedupe_id: 'train-1',
    list_date: new Date('2023-06-01'),
    sold_date: new Date('2023-06-15'),
    days_on_market: 14,
    month_index: 2023 * 12 + 6,
    property_type: 'single-family',
    lot_sqft: 7500,
    lat: 35.08,
    lng: -80.64,
    address: 'Test Address 1'
  },
  {
    id: 'train-2',
    price: 450000,
    sqft: 2200,
    beds: 4,
    baths: 3,
    garage: 2,
    year_built: 2023,
    is_new: true,
    price_ppsf: 205,
    status: 'sold',
    subdivision: 'test subdivision',
    school_zone: 'test school',
    dedupe_id: 'train-2',
    list_date: new Date('2023-07-01'),
    sold_date: new Date('2023-07-10'),
    days_on_market: 9,
    month_index: 2023 * 12 + 7,
    property_type: 'single-family',
    lot_sqft: 8000,
    lat: 35.08,
    lng: -80.64,
    address: 'Test Address 2'
  },
  {
    id: 'train-3',
    price: 380000,
    sqft: 1900,
    beds: 3,
    baths: 2.5,
    garage: 2,
    year_built: 2023,
    is_new: true,
    price_ppsf: 200,
    status: 'sold',
    subdivision: 'test subdivision',
    school_zone: 'test school',
    dedupe_id: 'train-3',
    list_date: new Date('2023-08-01'),
    sold_date: new Date('2023-08-20'),
    days_on_market: 19,
    month_index: 2023 * 12 + 8,
    property_type: 'single-family',
    lot_sqft: 7000,
    lat: 35.08,
    lng: -80.64,
    address: 'Test Address 3'
  }
  // Add more training records as needed...
];

// Helper function to create test scenarios
export function createTestScenario(
  subjectKey: keyof typeof subjectProperties,
  marketFilter?: (home: RecordRaw) => boolean
) {
  const subject = subjectProperties[subjectKey];
  const market = marketFilter ? marketData.filter(marketFilter) : marketData;
  
  return { subject, market };
}

// Validation helpers
export function isWithinRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

export function validatePricingResult(result: any, expected: any): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  let isValid = true;
  
  if (result.classification !== expected.classification) {
    errors.push(`Expected classification ${expected.classification}, got ${result.classification}`);
    isValid = false;
  }
  
  if (expected.confidenceRange && !isWithinRange(result.confidence, expected.confidenceRange[0], expected.confidenceRange[1])) {
    errors.push(`Confidence ${result.confidence} not in expected range [${expected.confidenceRange[0]}, ${expected.confidenceRange[1]}]`);
    isValid = false;
  }
  
  if (expected.medianPpsfRange && !isWithinRange(result.median_ppsf, expected.medianPpsfRange[0], expected.medianPpsfRange[1])) {
    errors.push(`Median PPSF ${result.median_ppsf} not in expected range [${expected.medianPpsfRange[0]}, ${expected.medianPpsfRange[1]}]`);
    isValid = false;
  }
  
  return { isValid, errors };
}