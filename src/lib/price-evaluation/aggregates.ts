import { HomeWithRelations } from '@/types';
import { MarketAggregates } from '@/lib/openai/types';

export function calculateMarketAggregates(homes: HomeWithRelations[]): MarketAggregates {
  // Group homes by square footage bands
  const sqftBands: { [band: string]: number[] } = {};
  const ppsfByBeds: { [beds: string]: number[] } = {};
  
  homes.forEach(home => {
    const ppsf = home.price / home.squareFootage;
    
    // Determine sqft band (bands of 400 sqft)
    const bandStart = Math.floor(home.squareFootage / 400) * 400;
    const bandEnd = bandStart + 400;
    const bandKey = `${bandStart}-${bandEnd}`;
    
    if (!sqftBands[bandKey]) {
      sqftBands[bandKey] = [];
    }
    sqftBands[bandKey].push(ppsf);
    
    // Group by bedrooms
    const bedKey = home.bedrooms.toString();
    if (!ppsfByBeds[bedKey]) {
      ppsfByBeds[bedKey] = [];
    }
    ppsfByBeds[bedKey].push(ppsf);
  });
  
  // Calculate percentiles for each band
  const ppsf_by_sqft_band: MarketAggregates['ppsf_by_sqft_band'] = {};
  for (const [band, values] of Object.entries(sqftBands)) {
    if (values.length > 0) {
      ppsf_by_sqft_band[band] = calculatePercentiles(values);
    }
  }
  
  const ppsf_by_beds: MarketAggregates['ppsf_by_beds'] = {};
  for (const [beds, values] of Object.entries(ppsfByBeds)) {
    if (values.length > 0) {
      ppsf_by_beds[beds] = calculatePercentiles(values);
    }
  }
  
  // Simple regression coefficients (estimated for North Carolina market)
  const coefficients = {
    intercept: 120000,
    heated_sqft: 145,
    bed_bonus: 8000,
    bath_bonus: 9500,
    garage_bonus: 6500,
    new_build_premium: 0.06
  };
  
  return {
    ppsf_by_sqft_band,
    ppsf_by_beds,
    coefficients
  };
}

function calculatePercentiles(values: number[]): { p25: number; median: number; p75: number } {
  const sorted = values.sort((a, b) => a - b);
  const len = sorted.length;
  
  if (len === 0) {
    return { p25: 0, median: 0, p75: 0 };
  }
  
  const getPercentile = (p: number) => {
    const index = (len - 1) * p;
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    
    if (upper >= len) return sorted[len - 1];
    if (lower === upper) return sorted[lower];
    
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  };
  
  return {
    p25: Math.round(getPercentile(0.25)),
    median: Math.round(getPercentile(0.5)),
    p75: Math.round(getPercentile(0.75))
  };
}