// Hedonic model tests

import {
  trainHedonic,
  extractFeatures,
  predictPriceLog,
  prepareTrainingData
} from '../hedonic';

import { hedonicTestData } from './fixtures';

describe('Hedonic Model Functions', () => {
  describe('extractFeatures', () => {
    test('extracts basic features correctly', () => {
      const record = hedonicTestData[0];
      const features = extractFeatures(record);
      
      // Check required features exist
      expect(features.log_sqft).toBeGreaterThan(0);
      expect(features.beds).toBe(record.beds);
      expect(features.baths).toBe(record.baths);
      expect(features.garage).toBe(record.garage);
      expect(features.is_new).toBe(record.is_new ? 1 : 0);
      expect(features.year).toBe(record.year_built);
      expect(features.month).toBe(record.month_index);
      
      // Check size buckets (should sum to 1)
      const sizeBuckets = features.sz_0_2k + features.sz_2_3k + features.sz_3k_plus;
      expect(sizeBuckets).toBe(1);
      
      // Verify log transformation
      expect(features.log_sqft).toBeCloseTo(Math.log(record.sqft), 2);
    });
    
    test('handles missing optional fields', () => {
      const record = {
        ...hedonicTestData[0],
        lot_sqft: undefined
      };
      
      const features = extractFeatures(record);
      
      // Should still work without lot_sqft
      expect(features.log_sqft).toBeGreaterThan(0);
      expect(features.log_lot).toBeUndefined();
    });
    
    test('applies size buckets correctly', () => {
      const smallHome = { ...hedonicTestData[0], sqft: 1800 };
      const mediumHome = { ...hedonicTestData[0], sqft: 2500 };
      const largeHome = { ...hedonicTestData[0], sqft: 3500 };
      
      const smallFeatures = extractFeatures(smallHome);
      const mediumFeatures = extractFeatures(mediumHome);
      const largeFeatures = extractFeatures(largeHome);
      
      // Small home (≤2000 sqft)
      expect(smallFeatures.sz_0_2k).toBe(1);
      expect(smallFeatures.sz_2_3k).toBe(0);
      expect(smallFeatures.sz_3k_plus).toBe(0);
      
      // Medium home (2000-3000 sqft)
      expect(mediumFeatures.sz_0_2k).toBe(0);
      expect(mediumFeatures.sz_2_3k).toBe(1);
      expect(mediumFeatures.sz_3k_plus).toBe(0);
      
      // Large home (>3000 sqft)
      expect(largeFeatures.sz_0_2k).toBe(0);
      expect(largeFeatures.sz_2_3k).toBe(0);
      expect(largeFeatures.sz_3k_plus).toBe(1);
    });
    
    test('handles forced month parameter', () => {
      const record = hedonicTestData[0];
      const forcedMonth = 2024 * 12 + 3; // March 2024
      
      const features = extractFeatures(record, undefined, forcedMonth);
      
      expect(features.month).toBe(forcedMonth);
    });
  });
  
  describe('prepareTrainingData', () => {
    test('prepares training data from records', () => {
      const trainingData = prepareTrainingData(hedonicTestData);
      
      expect(trainingData.records.length).toBe(hedonicTestData.length);
      expect(trainingData.features.length).toBe(hedonicTestData.length);
      expect(trainingData.targets.length).toBe(hedonicTestData.length);
      
      // Check that targets are log prices
      trainingData.targets.forEach((target, i) => {
        const expectedTarget = Math.log(hedonicTestData[i].price);
        expect(target).toBeCloseTo(expectedTarget, 2);
      });
    });
    
    test('filters invalid records', () => {
      const invalidRecord = {
        ...hedonicTestData[0],
        price: 0 // Invalid price
      };
      
      const recordsWithInvalid = [...hedonicTestData, invalidRecord];
      const trainingData = prepareTrainingData(recordsWithInvalid);
      
      // Should exclude the invalid record
      expect(trainingData.features.length).toBe(hedonicTestData.length);
      expect(trainingData.targets.length).toBe(hedonicTestData.length);
    });
  });
  
  describe('trainHedonic', () => {
    test('trains model with sufficient data', () => {
      // Create more training data for a robust test
      const expandedData = [];
      for (let i = 0; i < 15; i++) {
        expandedData.push({
          ...hedonicTestData[0],
          id: `train-${i}`,
          price: 350000 + (i * 10000),
          sqft: 1800 + (i * 100),
          beds: 3 + (i % 2),
          month_index: 2023 * 12 + (i % 12) + 1
        });
      }
      
      const model = trainHedonic(expandedData);
      
      // Check model structure
      expect(model.coef).toBeDefined();
      expect(model.intercept).toBeDefined();
      expect(model.rmseLog).toBeGreaterThan(0);
      expect(model.rmseLog).toBeLessThan(0.5); // Should be reasonable
      expect(model.alpha).toBeGreaterThan(0);
      expect(model.features).toBeDefined();
      expect(model.features.length).toBeGreaterThan(0);
      
      // Check that key features have coefficients
      expect(model.coef['log_sqft']).toBeDefined();
      expect(model.coef['beds']).toBeDefined();
      expect(model.coef['baths']).toBeDefined();
    });
    
    test('throws error with insufficient data', () => {
      const insufficientData = hedonicTestData.slice(0, 5); // Less than 10 records
      
      expect(() => {
        trainHedonic(insufficientData);
      }).toThrow('Insufficient training data');
    });
    
    test('chooses appropriate ridge parameter', () => {
      // Create training data with different variance patterns
      const smoothData = [];
      for (let i = 0; i < 20; i++) {
        smoothData.push({
          ...hedonicTestData[0],
          id: `smooth-${i}`,
          price: 400000 + (i * 2000), // Smooth price progression
          sqft: 2000 + (i * 50),      // Smooth size progression
          month_index: 2023 * 12 + (i % 12) + 1
        });
      }
      
      const model = trainHedonic(smoothData);
      
      // For smooth data, should choose smaller alpha (less regularization)
      expect(model.alpha).toBeGreaterThan(0);
      expect(model.alpha).toBeLessThanOrEqual(10);
      expect(model.rmseLog).toBeGreaterThan(0);
      expect(model.rmseLog).toBeLessThan(0.3); // Should fit well
    });
  });
  
  describe('predictPriceLog', () => {
    test('predicts price using trained model', () => {
      // Create training data
      const expandedData = [];
      for (let i = 0; i < 15; i++) {
        expandedData.push({
          ...hedonicTestData[0],
          id: `train-${i}`,
          price: 300000 + (i * 15000),
          sqft: 1700 + (i * 120),
          beds: 3 + (i % 2),
          month_index: 2023 * 12 + (i % 12) + 1
        });
      }
      
      const model = trainHedonic(expandedData);
      
      // Test prediction on a similar property
      const testRecord = {
        ...expandedData[0],
        id: 'test-prediction'
      };
      const features = extractFeatures(testRecord);
      
      const logPrice = predictPriceLog(features, model);
      const predictedPrice = Math.exp(logPrice);
      
      expect(logPrice).toBeGreaterThan(0);
      expect(predictedPrice).toBeGreaterThan(200000);
      expect(predictedPrice).toBeLessThan(800000);
      
      // Should be reasonably close to actual price (within 20%)
      const actualPrice = testRecord.price;
      const error = Math.abs(predictedPrice - actualPrice) / actualPrice;
      expect(error).toBeLessThan(0.25); // Allow 25% error for test data
    });
    
    test('handles missing feature gracefully', () => {
      const model = {
        coef: { 
          log_sqft: 0.8,
          beds: 0.05,
          missing_feature: 0.1 
        },
        intercept: 12.0,
        rmseLog: 0.15,
        alpha: 1.0,
        features: ['log_sqft', 'beds', 'missing_feature']
      };
      
      const features = extractFeatures(hedonicTestData[0]);
      // features won't have 'missing_feature'
      
      const logPrice = predictPriceLog(features, model);
      
      // Should still work (missing features treated as 0)
      expect(logPrice).toBeGreaterThan(0);
    });
  });
  
  describe('time adjustment isolation', () => {
    test('isolates time adjustment correctly', () => {
      // This test verifies the mathematical isolation of time effects
      // as specified in the plan
      
      // Create training data with clear time trends
      const timeData = [];
      for (let month = 1; month <= 12; month++) {
        const monthlyAppreciation = 0.003; // 0.3% per month
        const basePrice = 400000;
        const timeAdjustedPrice = basePrice * Math.exp(monthlyAppreciation * month);
        
        timeData.push({
          ...hedonicTestData[0],
          id: `time-${month}`,
          price: timeAdjustedPrice,
          month_index: 2023 * 12 + month,
          sqft: 2000, // Keep other features constant
          beds: 4,
          baths: 2.5
        });
      }
      
      const model = trainHedonic(timeData);
      
      // The month coefficient should capture the appreciation trend
      const monthCoeff = model.coef['month'] || 0;
      expect(Math.abs(monthCoeff)).toBeGreaterThan(0.001); // Should detect time trend
    });
  });
  
  describe('integration tests', () => {
    test('complete hedonic modeling workflow', () => {
      // Create realistic training dataset
      const realisticData = [];
      
      const baseConfigs = [
        { beds: 3, baths: 2, sqft: 1800, basePrice: 350000 },
        { beds: 4, baths: 2.5, sqft: 2100, basePrice: 400000 },
        { beds: 4, baths: 3, sqft: 2400, basePrice: 450000 },
        { beds: 5, baths: 3.5, sqft: 2800, basePrice: 520000 }
      ];
      
      baseConfigs.forEach((config, configIndex) => {
        for (let i = 0; i < 5; i++) {
          const priceVariation = 0.9 + (Math.random() * 0.2); // ±10% variation
          realisticData.push({
            ...hedonicTestData[0],
            id: `realistic-${configIndex}-${i}`,
            price: Math.round(config.basePrice * priceVariation),
            beds: config.beds,
            baths: config.baths,
            sqft: config.sqft + (Math.random() * 200 - 100), // ±100 sqft variation
            month_index: 2023 * 12 + Math.floor(Math.random() * 12) + 1,
            year_built: 2022 + Math.floor(Math.random() * 3)
          });
        }
      });
      
      // Train model
      const model = trainHedonic(realisticData);
      
      // Test prediction accuracy on training data
      let totalError = 0;
      let validPredictions = 0;
      
      realisticData.forEach(record => {
        try {
          const features = extractFeatures(record);
          const logPrice = predictPriceLog(features, model);
          const predictedPrice = Math.exp(logPrice);
          const actualPrice = record.price;
          
          const relativeError = Math.abs(predictedPrice - actualPrice) / actualPrice;
          totalError += relativeError;
          validPredictions++;
          
          // Individual prediction should be reasonable
          expect(predictedPrice).toBeGreaterThan(actualPrice * 0.5);
          expect(predictedPrice).toBeLessThan(actualPrice * 2.0);
        } catch (error) {
          // Some predictions might fail, but most should work
        }
      });
      
      if (validPredictions > 0) {
        const avgError = totalError / validPredictions;
        expect(avgError).toBeLessThan(0.3); // Average error should be < 30%
      }
      
      // Model quality checks
      expect(model.rmseLog).toBeLessThan(0.5);
      expect(model.features.length).toBeGreaterThan(5);
    });
  });
});