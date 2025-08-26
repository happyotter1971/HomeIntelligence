// Statistics module tests

import {
  median,
  percentile,
  winsorize,
  mad,
  robustBandPct,
  coeffVariation,
  mean,
  standardDeviation,
  iqr,
  robustStats,
  clamp
} from '../stats';

import { statisticalTestData } from './fixtures';

describe('Statistics Functions', () => {
  describe('median', () => {
    test('calculates median for odd number of values', () => {
      expect(median([1, 3, 5])).toBe(3);
    });
    
    test('calculates median for even number of values', () => {
      expect(median([1, 2, 3, 4])).toBe(2.5);
    });
    
    test('handles single value', () => {
      expect(median([42])).toBe(42);
    });
    
    test('handles empty array', () => {
      expect(median([])).toBe(0);
    });
    
    test('handles unsorted array', () => {
      expect(median([5, 1, 9, 3, 7])).toBe(5);
    });
  });
  
  describe('percentile', () => {
    const data = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
    
    test('calculates 25th percentile', () => {
      expect(percentile(data, 25)).toBeCloseTo(32.5);
    });
    
    test('calculates 50th percentile (median)', () => {
      expect(percentile(data, 50)).toBe(55);
    });
    
    test('calculates 75th percentile', () => {
      expect(percentile(data, 75)).toBeCloseTo(77.5);
    });
    
    test('handles edge cases', () => {
      expect(percentile(data, 0)).toBe(10);
      expect(percentile(data, 100)).toBe(100);
    });
    
    test('throws error for invalid percentile', () => {
      expect(() => percentile(data, -1)).toThrow();
      expect(() => percentile(data, 101)).toThrow();
    });
  });
  
  describe('winsorize', () => {
    test('winsorizes outliers correctly', () => {
      const data = statisticalTestData.withOutliers; // [200, 205, 203, 260, 202, 199]
      const winsorized = winsorize(data, 10, 90);
      
      // The outlier at 260 should be clipped to P90
      expect(Math.max(...winsorized)).toBeLessThan(260);
      expect(winsorized.length).toBe(data.length);
    });
    
    test('handles data without outliers', () => {
      const data = statisticalTestData.tightMarket; // [204, 205, 206, 205, 205, 206]
      const winsorized = winsorize(data, 10, 90);
      
      // Should be minimal changes
      expect(winsorized).toEqual(expect.arrayContaining(data));
    });
    
    test('throws error for invalid percentiles', () => {
      expect(() => winsorize([1, 2, 3], 90, 10)).toThrow();
    });
  });
  
  describe('robustBandPct', () => {
    test('calculates tight market band', () => {
      const ppsf = statisticalTestData.tightMarket; // [204, 205, 206, 205, 205, 206]
      const medianVal = median(ppsf); // ~205
      const bandPct = robustBandPct(ppsf, medianVal);
      
      // Expect band_pct around 0.02 to 0.03 for tight market
      expect(bandPct).toBeGreaterThanOrEqual(0.02);
      expect(bandPct).toBeLessThanOrEqual(0.05);
    });
    
    test('calculates volatile market band', () => {
      const ppsf = statisticalTestData.volatileMarket; // [180, 220, 190, 240, 200, 210]
      const bandPct = robustBandPct(ppsf);
      
      // Expect higher band for volatile market
      expect(bandPct).toBeGreaterThan(0.08);
    });
    
    test('handles empty array', () => {
      const bandPct = robustBandPct([]);
      expect(bandPct).toBe(0.05); // Default fallback
    });
    
    test('caps maximum band percentage', () => {
      const extremeData = [50, 100, 150, 300, 400]; // Very high variance
      const bandPct = robustBandPct(extremeData);
      expect(bandPct).toBeLessThanOrEqual(0.30);
    });
  });
  
  describe('coeffVariation', () => {
    test('calculates CV for normal data', () => {
      const data = [100, 110, 90, 105, 95];
      const cv = coeffVariation(data);
      expect(cv).toBeGreaterThan(0);
      expect(cv).toBeLessThan(1); // Should be reasonable for this data
    });
    
    test('handles zero mean', () => {
      const data = [0, 0, 0];
      const cv = coeffVariation(data);
      expect(cv).toBe(0);
    });
    
    test('handles empty array', () => {
      const cv = coeffVariation([]);
      expect(cv).toBe(0);
    });
  });
  
  describe('mad (Median Absolute Deviation)', () => {
    test('calculates MAD correctly', () => {
      const data = [1, 1, 2, 2, 4, 6, 9];
      const madValue = mad(data);
      
      // Median is 2, deviations are [1,1,0,0,2,4,7]
      // Median of deviations should be 1
      expect(madValue).toBe(1);
    });
    
    test('handles identical values', () => {
      const data = [5, 5, 5, 5];
      const madValue = mad(data);
      expect(madValue).toBe(0);
    });
    
    test('handles empty array', () => {
      const madValue = mad([]);
      expect(madValue).toBe(0);
    });
  });
  
  describe('robustStats', () => {
    test('computes all statistics correctly', () => {
      const data = [10, 20, 30, 40, 50];
      const stats = robustStats(data);
      
      expect(stats.median).toBe(30);
      expect(stats.mean).toBe(30);
      expect(stats.p25).toBe(20);
      expect(stats.p75).toBe(40);
      expect(stats.iqr).toBe(20);
      expect(stats.mad).toBeGreaterThanOrEqual(0);
      expect(stats.std).toBeGreaterThan(0);
      expect(stats.cv).toBeGreaterThan(0);
    });
    
    test('handles edge cases', () => {
      const stats = robustStats([]);
      expect(stats.median).toBe(0);
      expect(stats.mean).toBe(0);
    });
  });
  
  describe('clamp', () => {
    test('clamps values within bounds', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });
    
    test('handles equal min and max', () => {
      expect(clamp(5, 7, 7)).toBe(7);
    });
  });
  
  describe('integration tests', () => {
    test('statistical pipeline matches expected behavior', () => {
      const tightMarket = statisticalTestData.tightMarket;
      
      // Test the full pipeline
      const medianVal = median(tightMarket);
      const p25 = percentile(tightMarket, 25);
      const p75 = percentile(tightMarket, 75);
      const bandPct = robustBandPct(tightMarket);
      const winsorized = winsorize(tightMarket, 10, 90);
      
      // Verify relationships
      expect(p25).toBeLessThanOrEqual(medianVal);
      expect(medianVal).toBeLessThanOrEqual(p75);
      expect(bandPct).toBeLessThan(0.10); // Tight market
      expect(winsorized.length).toBe(tightMarket.length);
    });
    
    test('handles real estate pricing scenarios', () => {
      // Simulate realistic PPSF values
      const ppsfValues = [195, 205, 198, 207, 201, 203, 199, 210];
      const stats = robustStats(ppsfValues);
      
      expect(stats.median).toBeGreaterThan(190);
      expect(stats.median).toBeLessThan(220);
      expect(stats.cv).toBeLessThan(0.1); // Real estate shouldn't be super volatile
      
      const bandPct = robustBandPct(ppsfValues);
      expect(bandPct).toBeGreaterThan(0.02);
      expect(bandPct).toBeLessThan(0.15);
    });
  });
});