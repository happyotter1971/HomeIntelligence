import { SanitizedRecord } from './data-sanitization';

export interface OutlierAnalysis {
  isOutlier: boolean;
  score: number; // 0-100, higher = more likely to be valid
  flags: OutlierFlag[];
  recommendation: 'include' | 'exclude' | 'review';
}

export interface OutlierFlag {
  type: 'price' | 'ppsf' | 'size' | 'ratio' | 'market';
  severity: 'low' | 'medium' | 'high';
  message: string;
  value?: number;
  expected?: { min: number; max: number };
}

export interface MarketBounds {
  priceRange: { min: number; max: number };
  ppsfRange: { min: number; max: number };
  sqftRange: { min: number; max: number };
  ppsfByBeds: { [beds: string]: { min: number; max: number } };
  ppsfPercentiles: { p25: number; median: number; p75: number };
}

export function calculateMarketBounds(records: SanitizedRecord[]): MarketBounds {
  if (records.length === 0) {
    return {
      priceRange: { min: 200000, max: 800000 },
      ppsfRange: { min: 100, max: 300 },
      sqftRange: { min: 1000, max: 4000 },
      ppsfByBeds: {},
      ppsfPercentiles: { p25: 150, median: 180, p75: 220 }
    };
  }
  
  const prices = records.map(r => r.price).filter(Boolean);
  const ppsfValues = records.map(r => r.pricePpsf).filter(Boolean) as number[];
  const sqftValues = records.map(r => r.sqft).filter(Boolean) as number[];
  
  // Group by bedrooms
  const ppsfByBeds: { [beds: string]: number[] } = {};
  records.forEach(record => {
    if (record.beds && record.pricePpsf) {
      const bedKey = record.beds.toString();
      if (!ppsfByBeds[bedKey]) ppsfByBeds[bedKey] = [];
      ppsfByBeds[bedKey].push(record.pricePpsf);
    }
  });
  
  // Calculate bounds using IQR method
  const getBounds = (values: number[], multiplier = 1.5) => {
    const sorted = values.sort((a, b) => a - b);
    const q25 = getPercentile(sorted, 0.25);
    const q75 = getPercentile(sorted, 0.75);
    const iqr = q75 - q25;
    
    return {
      min: Math.max(sorted[0], q25 - iqr * multiplier),
      max: Math.min(sorted[sorted.length - 1], q75 + iqr * multiplier)
    };
  };
  
  const priceRange = getBounds(prices);
  const ppsfRange = getBounds(ppsfValues);
  const sqftRange = getBounds(sqftValues);
  
  // Calculate PPSF bounds by bedroom count
  const ppsfByBedsRanges: { [beds: string]: { min: number; max: number } } = {};
  for (const [beds, values] of Object.entries(ppsfByBeds)) {
    if (values.length >= 3) {
      ppsfByBedsRanges[beds] = getBounds(values, 2.0); // More lenient for bedroom-specific
    }
  }
  
  const ppsfPercentiles = {
    p25: getPercentile(ppsfValues, 0.25),
    median: getPercentile(ppsfValues, 0.50),
    p75: getPercentile(ppsfValues, 0.75)
  };
  
  return {
    priceRange,
    ppsfRange,
    sqftRange,
    ppsfByBeds: ppsfByBedsRanges,
    ppsfPercentiles
  };
}

export function detectOutliers(
  record: SanitizedRecord,
  marketBounds: MarketBounds
): OutlierAnalysis {
  const flags: OutlierFlag[] = [];
  let score = 100;
  
  // Price validation
  if (record.price < marketBounds.priceRange.min) {
    const severity = record.price < marketBounds.priceRange.min * 0.7 ? 'high' : 'medium';
    flags.push({
      type: 'price',
      severity,
      message: `Price $${record.price.toLocaleString()} is below market range`,
      value: record.price,
      expected: marketBounds.priceRange
    });
    score -= severity === 'high' ? 40 : 20;
  }
  
  if (record.price > marketBounds.priceRange.max) {
    const severity = record.price > marketBounds.priceRange.max * 1.5 ? 'high' : 'medium';
    flags.push({
      type: 'price',
      severity,
      message: `Price $${record.price.toLocaleString()} is above market range`,
      value: record.price,
      expected: marketBounds.priceRange
    });
    score -= severity === 'high' ? 30 : 15;
  }
  
  // PPSF validation
  if (record.pricePpsf) {
    if (record.pricePpsf < marketBounds.ppsfRange.min) {
      const severity = record.pricePpsf < marketBounds.ppsfRange.min * 0.8 ? 'high' : 'medium';
      flags.push({
        type: 'ppsf',
        severity,
        message: `Price per sqft $${record.pricePpsf.toFixed(0)} is below market range`,
        value: record.pricePpsf,
        expected: marketBounds.ppsfRange
      });
      score -= severity === 'high' ? 35 : 20;
    }
    
    if (record.pricePpsf > marketBounds.ppsfRange.max) {
      const severity = record.pricePpsf > marketBounds.ppsfRange.max * 1.3 ? 'high' : 'medium';
      flags.push({
        type: 'ppsf',
        severity,
        message: `Price per sqft $${record.pricePpsf.toFixed(0)} is above market range`,
        value: record.pricePpsf,
        expected: marketBounds.ppsfRange
      });
      score -= severity === 'high' ? 25 : 15;
    }
    
    // Bedroom-specific PPSF validation
    if (record.beds) {
      const bedKey = record.beds.toString();
      const bedBounds = marketBounds.ppsfByBeds[bedKey];
      
      if (bedBounds) {
        if (record.pricePpsf < bedBounds.min || record.pricePpsf > bedBounds.max) {
          flags.push({
            type: 'market',
            severity: 'medium',
            message: `PPSF unusual for ${record.beds}-bedroom homes in this market`,
            value: record.pricePpsf,
            expected: bedBounds
          });
          score -= 15;
        }
      }
    }
  }
  
  // Size validation
  if (record.sqft) {
    if (record.sqft < marketBounds.sqftRange.min) {
      flags.push({
        type: 'size',
        severity: 'medium',
        message: `Square footage ${record.sqft} is unusually small`,
        value: record.sqft,
        expected: marketBounds.sqftRange
      });
      score -= 15;
    }
    
    if (record.sqft > marketBounds.sqftRange.max) {
      flags.push({
        type: 'size',
        severity: 'medium',
        message: `Square footage ${record.sqft} is unusually large`,
        value: record.sqft,
        expected: marketBounds.sqftRange
      });
      score -= 10;
    }
  }
  
  // Ratio validation
  if (record.beds && record.sqft) {
    const sqftPerBed = record.sqft / record.beds;
    if (sqftPerBed < 200) {
      flags.push({
        type: 'ratio',
        severity: 'high',
        message: `Only ${Math.round(sqftPerBed)} sqft per bedroom - unusually cramped`,
        value: sqftPerBed
      });
      score -= 30;
    }
    
    if (sqftPerBed > 1000) {
      flags.push({
        type: 'ratio',
        severity: 'medium',
        message: `${Math.round(sqftPerBed)} sqft per bedroom - unusually spacious`,
        value: sqftPerBed
      });
      score -= 10;
    }
  }
  
  if (record.baths && record.beds) {
    const bathToBedRatio = record.baths / record.beds;
    if (bathToBedRatio < 0.5) {
      flags.push({
        type: 'ratio',
        severity: 'medium',
        message: `Only ${record.baths} baths for ${record.beds} bedrooms`,
        value: bathToBedRatio
      });
      score -= 10;
    }
  }
  
  // Determine recommendation
  let recommendation: 'include' | 'exclude' | 'review';
  const highSeverityFlags = flags.filter(f => f.severity === 'high');
  
  if (score < 40 || highSeverityFlags.length >= 2) {
    recommendation = 'exclude';
  } else if (score < 70 || highSeverityFlags.length >= 1) {
    recommendation = 'review';
  } else {
    recommendation = 'include';
  }
  
  return {
    isOutlier: flags.length > 0,
    score: Math.max(0, Math.min(100, score)),
    flags,
    recommendation
  };
}

export function filterOutliers(
  records: SanitizedRecord[],
  strictness: 'lenient' | 'moderate' | 'strict' = 'moderate'
): { 
  clean: SanitizedRecord[];
  outliers: { record: SanitizedRecord; analysis: OutlierAnalysis }[];
  stats: { total: number; clean: number; outliers: number; excluded: number };
} {
  const marketBounds = calculateMarketBounds(records);
  const analyzed = records.map(record => ({
    record,
    analysis: detectOutliers(record, marketBounds)
  }));
  
  const thresholds = {
    lenient: { minScore: 30, allowReview: true },
    moderate: { minScore: 50, allowReview: true },
    strict: { minScore: 70, allowReview: false }
  };
  
  const threshold = thresholds[strictness];
  
  const clean = analyzed.filter(({ analysis }) => {
    if (analysis.recommendation === 'exclude') return false;
    if (analysis.recommendation === 'review' && !threshold.allowReview) return false;
    return analysis.score >= threshold.minScore;
  }).map(({ record }) => record);
  
  const outliers = analyzed.filter(({ analysis }) => analysis.isOutlier);
  const excluded = analyzed.length - clean.length;
  
  return {
    clean,
    outliers,
    stats: {
      total: records.length,
      clean: clean.length,
      outliers: outliers.length,
      excluded
    }
  };
}

function getPercentile(sortedArray: number[], percentile: number): number {
  if (sortedArray.length === 0) return 0;
  
  const index = (sortedArray.length - 1) * percentile;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;
  
  if (upper >= sortedArray.length) return sortedArray[sortedArray.length - 1];
  if (lower === upper) return sortedArray[lower];
  
  return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
}