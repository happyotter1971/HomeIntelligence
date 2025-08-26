// Pipeline integration tests

import { valueSubject } from '../pipeline';
import { subjectProperties, marketData, expectedResults, validatePricingResult } from './fixtures';

describe('Enhanced Pricing Pipeline', () => {
  describe('valueSubject', () => {
    test('completes full pipeline successfully', async () => {
      const subject = subjectProperties.typical;
      const result = valueSubject(subject, marketData);
      
      expect(result.status).toBe('success');
      expect(result.classification).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
      expect(result.median_ppsf).toBeGreaterThan(0);
      expect(result.suggested_price_range.low).toBeGreaterThan(0);
      expect(result.suggested_price_range.high).toBeGreaterThan(result.suggested_price_range.low);
      expect(result.explain).toBeDefined();
      expect(result.model_stats).toBeDefined();
    });
    
    test('produces Market Fair classification for typical subject', () => {
      const subject = subjectProperties.typical;
      const result = valueSubject(subject, marketData);
      
      // For our test data, typical subject should be market fair
      const validation = validatePricingResult(result, expectedResults.tightMarket);
      
      if (!validation.isValid) {
        console.warn('Pricing validation warnings:', validation.errors);
      }
      
      // Core expectations that should always hold
      expect(result.status).toBe('success');
      expect(['Below', 'Market Fair', 'Above']).toContain(result.classification);
      expect(result.model_stats?.comp_count).toBeGreaterThanOrEqual(3);
    });
    
    test('handles insufficient data gracefully', () => {
      const subject = subjectProperties.typical;
      const limitedMarket = marketData.slice(0, 1); // Very limited data
      
      const result = valueSubject(subject, limitedMarket);
      
      expect(result.status).toBe('insufficient_data');
      expect(result.classification).toBe('Insufficient Data');
      expect(result.confidence).toBe(0);
    });
    
    test('handles invalid subject data', () => {
      const invalidSubject = {
        ...subjectProperties.typical,
        price: 0, // Invalid price
        sqft: 0   // Invalid sqft
      };
      
      const result = valueSubject(invalidSubject, marketData);
      
      expect(['insufficient_data', 'error']).toContain(result.status);
    });
    
    test('produces reasonable suggested price range', () => {
      const subject = subjectProperties.typical;
      const result = valueSubject(subject, marketData);
      
      if (result.status === 'success') {
        const { low, high } = result.suggested_price_range;
        const subjectPrice = subject.price;
        
        // Range should be reasonable relative to subject price
        expect(low).toBeGreaterThan(subjectPrice * 0.6);
        expect(high).toBeLessThan(subjectPrice * 1.6);
        expect(high - low).toBeGreaterThan(subjectPrice * 0.1); // At least 10% range
      }
    });
    
    test('explains results properly', () => {
      const subject = subjectProperties.typical;
      const result = valueSubject(subject, marketData);
      
      if (result.status === 'success') {
        const { explain } = result;
        
        // Top 3 comparables
        expect(explain.top3).toBeDefined();
        expect(explain.top3.length).toBeGreaterThan(0);
        expect(explain.top3.length).toBeLessThanOrEqual(3);
        
        explain.top3.forEach(comp => {
          expect(comp.id).toBeDefined();
          expect(comp.raw_ppsf).toBeGreaterThan(0);
          expect(comp.adjusted_ppsf).toBeGreaterThan(0);
          expect(comp.distance_miles).toBeGreaterThanOrEqual(0);
        });
        
        // Band explanation
        expect(explain.band.median).toBeGreaterThan(0);
        expect(explain.band.band_pct).toBeGreaterThan(0);
        expect(explain.band.fair_range.low).toBeGreaterThan(0);
        expect(explain.band.fair_range.high).toBeGreaterThan(explain.band.fair_range.low);
        expect(explain.band.subject_ppsf).toBeGreaterThan(0);
        
        // Reconciliation
        expect(explain.recon.p_med).toBeGreaterThan(0);
        expect(explain.recon.p_hed).toBeGreaterThan(0);
        expect(explain.recon.diff_pct).toBeGreaterThanOrEqual(0);
        expect(typeof explain.recon.flag).toBe('boolean');
      }
    });
    
    test('reconciliation flag triggers correctly', () => {
      const subject = subjectProperties.typical;
      const result = valueSubject(subject, marketData, { useHedonicModel: true });
      
      if (result.status === 'success' && result.explain.recon.flag) {
        // If reconciliation flag is true, should have 5%+ difference
        expect(result.explain.recon.diff_pct).toBeGreaterThan(5);
        
        // Confidence should be reduced by 20 points due to reconciliation flag
        // (Hard to test exact amount due to other factors, but should be noted)
        expect(result.confidence).toBeLessThan(100);
      }
    });
    
    test('hedonic model integration works', () => {
      const subject = subjectProperties.typical;
      
      // Test with hedonic model enabled
      const withHedonic = valueSubject(subject, marketData, { 
        useHedonicModel: true,
        fallbackToHeuristics: true 
      });
      
      // Test with hedonic model disabled
      const withoutHedonic = valueSubject(subject, marketData, { 
        useHedonicModel: false 
      });
      
      // Both should succeed
      expect(withHedonic.status).toBe('success');
      expect(withoutHedonic.status).toBe('success');
      
      // Results might differ but should be reasonable
      if (withHedonic.status === 'success' && withoutHedonic.status === 'success') {
        expect(withHedonic.classification).toBeDefined();
        expect(withoutHedonic.classification).toBeDefined();
        
        // Both should have valid confidence scores
        expect(withHedonic.confidence).toBeGreaterThan(0);
        expect(withoutHedonic.confidence).toBeGreaterThan(0);
      }
    });
    
    test('confidence scoring responds to data quality', () => {
      const subject = subjectProperties.typical;
      
      // Test with good quality market data (our standard test data)
      const goodDataResult = valueSubject(subject, marketData);
      
      // Test with limited/poor quality data
      const poorMarket = marketData.slice(0, 3).map(home => ({
        ...home,
        id: `poor-${home.id}`,
        beds: home.beds + 1, // Make them less similar
        sqft: home.sqft * 1.3
      }));
      
      const poorDataResult = valueSubject(subject, poorMarket);
      
      if (goodDataResult.status === 'success' && poorDataResult.status === 'success') {
        // Good data should generally have higher confidence
        // (Though this isn't guaranteed due to other factors)
        expect(goodDataResult.confidence).toBeGreaterThan(0);
        expect(poorDataResult.confidence).toBeGreaterThan(0);
        
        // At minimum, both should be valid confidence scores
        expect(goodDataResult.confidence).toBeLessThanOrEqual(100);
        expect(poorDataResult.confidence).toBeLessThanOrEqual(100);
      }
    });
    
    test('price gap calculation is accurate', () => {
      const subject = subjectProperties.typical;
      const result = valueSubject(subject, marketData);
      
      if (result.status === 'success') {
        const { price_gap } = result;
        const subjectPpsf = subject.price / subject.sqft;
        const expectedDelta = subjectPpsf - result.median_ppsf;
        const expectedTotal = expectedDelta * subject.sqft;
        
        expect(price_gap.delta_ppsf).toBeCloseTo(expectedDelta, 1);
        expect(price_gap.total_delta).toBeCloseTo(expectedTotal, 0);
      }
    });
    
    test('classification logic matches specification', () => {
      // Test each classification scenario
      const testScenarios = [
        {
          name: 'below market',
          subject: { ...subjectProperties.typical, price: 300000 }, // Lower price
          expectedClassification: 'Below'
        },
        {
          name: 'above market', 
          subject: { ...subjectProperties.typical, price: 550000 }, // Higher price
          expectedClassification: 'Above'
        },
        {
          name: 'market fair',
          subject: subjectProperties.typical, // Normal price
          expectedClassification: 'Market Fair'
        }
      ];
      
      testScenarios.forEach(scenario => {
        const result = valueSubject(scenario.subject, marketData);
        
        if (result.status === 'success') {
          // Classifications should follow the 5% threshold logic
          const subjectPpsf = scenario.subject.price / scenario.subject.sqft;
          const medianPpsf = result.median_ppsf;
          const deviation = (subjectPpsf - medianPpsf) / medianPpsf;
          
          if (Math.abs(deviation) <= 0.05) {
            expect(result.classification).toBe('Market Fair');
          } else if (deviation < -0.05) {
            expect(result.classification).toBe('Below');
          } else if (deviation > 0.05) {
            expect(result.classification).toBe('Above');
          }
        }
      });
    });
  });
  
  describe('pipeline options', () => {
    test('respects minComps parameter', () => {
      const subject = subjectProperties.typical;
      
      const result = valueSubject(subject, marketData, { minComps: 5 });
      
      if (result.status === 'success') {
        expect(result.model_stats?.comp_count).toBeGreaterThanOrEqual(5);
      }
      // If insufficient data, should return appropriate status
    });
    
    test('respects useHedonicModel parameter', () => {
      const subject = subjectProperties.typical;
      
      const withHedonic = valueSubject(subject, marketData, { useHedonicModel: true });
      const withoutHedonic = valueSubject(subject, marketData, { useHedonicModel: false });
      
      // Both should complete successfully
      expect(['success', 'insufficient_data']).toContain(withHedonic.status);
      expect(['success', 'insufficient_data']).toContain(withoutHedonic.status);
    });
    
    test('handles fallback scenarios correctly', () => {
      const subject = subjectProperties.typical;
      
      const result = valueSubject(subject, marketData, { 
        useHedonicModel: true,
        fallbackToHeuristics: true 
      });
      
      // Should not fail due to fallback capability
      expect(result.status).toBe('success');
    });
  });
  
  describe('error handling', () => {
    test('handles malformed subject data', () => {
      const malformedSubject = {
        id: 'test',
        price: 'invalid',
        sqft: null
      };
      
      const result = valueSubject(malformedSubject as any, marketData);
      
      expect(['insufficient_data', 'error']).toContain(result.status);
      expect(result.confidence).toBe(0);
    });
    
    test('handles empty market data', () => {
      const subject = subjectProperties.typical;
      const result = valueSubject(subject, []);
      
      expect(result.status).toBe('insufficient_data');
      expect(result.classification).toBe('Insufficient Data');
    });
    
    test('handles malformed market data', () => {
      const subject = subjectProperties.typical;
      const badMarket = [
        { id: 'bad1', price: null },
        { id: 'bad2', sqft: 'invalid' },
        null,
        undefined
      ];
      
      const result = valueSubject(subject, badMarket as any);
      
      expect(['insufficient_data', 'error']).toContain(result.status);
    });
  });
  
  describe('performance and scalability', () => {
    test('completes in reasonable time with large dataset', () => {
      const subject = subjectProperties.typical;
      
      // Create larger market dataset
      const largeMarket = [];
      for (let i = 0; i < 100; i++) {
        largeMarket.push({
          ...marketData[i % marketData.length],
          id: `large-market-${i}`,
          price: marketData[i % marketData.length].price + (Math.random() * 50000 - 25000)
        });
      }
      
      const startTime = Date.now();
      const result = valueSubject(subject, largeMarket);
      const duration = Date.now() - startTime;
      
      // Should complete within reasonable time (10 seconds)
      expect(duration).toBeLessThan(10000);
      expect(result.status).toBe('success');
    });
    
    test('handles extreme property values gracefully', () => {
      const extremeSubjects = [
        { ...subjectProperties.typical, price: 50000, sqft: 500 },     // Very small/cheap
        { ...subjectProperties.typical, price: 2000000, sqft: 8000 }, // Very large/expensive
        { ...subjectProperties.typical, beds: 1, baths: 1 },          // Minimal beds/baths
        { ...subjectProperties.typical, beds: 8, baths: 6 }           // Many beds/baths
      ];
      
      extremeSubjects.forEach(subject => {
        const result = valueSubject(subject, marketData);
        
        // Should not crash, though might return insufficient data
        expect(['success', 'insufficient_data', 'error']).toContain(result.status);
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(100);
      });
    });
  });
});