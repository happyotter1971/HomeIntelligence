// Robust statistics functions for deterministic pricing analysis

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  } else {
    return sorted[mid];
  }
}

export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  if (p < 0 || p > 100) throw new Error('Percentile must be between 0 and 100');
  
  const sorted = [...values].sort((a, b) => a - b);
  
  if (p === 0) return sorted[0];
  if (p === 100) return sorted[sorted.length - 1];
  
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  
  if (lower === upper) {
    return sorted[lower];
  }
  
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

export function winsorize(values: number[], lowerPct: number = 10, upperPct: number = 90): number[] {
  if (values.length === 0) return [];
  if (lowerPct >= upperPct) throw new Error('Lower percentile must be less than upper percentile');
  
  const lowerBound = percentile(values, lowerPct);
  const upperBound = percentile(values, upperPct);
  
  return values.map(x => {
    if (x < lowerBound) return lowerBound;
    if (x > upperBound) return upperBound;
    return x;
  });
}

export function mad(values: number[]): number {
  if (values.length === 0) return 0;
  
  const med = median(values);
  const deviations = values.map(x => Math.abs(x - med));
  return median(deviations);
}

export function robustBandPct(ppsf: number[], medianValue?: number): number {
  if (ppsf.length === 0) return 0.05; // Default fallback
  
  const med = medianValue ?? median(ppsf);
  if (med === 0) return 0.05;
  
  const madValue = mad(ppsf);
  
  if (madValue > 0) {
    // Use MAD-based estimate: 1.4826 * MAD / median
    const bandPct = Math.max(0.03, (1.4826 * madValue) / med);
    return Math.min(bandPct, 0.30); // Cap at 30%
  } else {
    // Fallback to IQR-based estimate
    const p25 = percentile(ppsf, 25);
    const p75 = percentile(ppsf, 75);
    const iqr = p75 - p25;
    
    if (iqr > 0) {
      const bandPct = Math.max(0.03, (0.5 * iqr) / med);
      return Math.min(bandPct, 0.30);
    }
  }
  
  return 0.05; // Final fallback
}

export function coeffVariation(values: number[]): number {
  if (values.length === 0) return 0;
  
  const mean = values.reduce((sum, x) => sum + x, 0) / values.length;
  
  if (mean === 0) return 0;
  
  const variance = values.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / values.length;
  const std = Math.sqrt(variance);
  
  return std / mean;
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, x) => sum + x, 0) / values.length;
}

export function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  
  const avg = mean(values);
  const variance = values.reduce((sum, x) => sum + Math.pow(x - avg, 2), 0) / values.length;
  
  return Math.sqrt(variance);
}

export function iqr(values: number[]): number {
  return percentile(values, 75) - percentile(values, 25);
}

export function robustStats(values: number[]): {
  median: number;
  p25: number;
  p75: number;
  mad: number;
  iqr: number;
  mean: number;
  std: number;
  cv: number;
} {
  return {
    median: median(values),
    p25: percentile(values, 25),
    p75: percentile(values, 75),
    mad: mad(values),
    iqr: iqr(values),
    mean: mean(values),
    std: standardDeviation(values),
    cv: coeffVariation(values)
  };
}

// Helper function for safe division
export function safeDivide(numerator: number, denominator: number, fallback: number = 0): number {
  return denominator === 0 ? fallback : numerator / denominator;
}

// Clamp function for keeping values within bounds
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}