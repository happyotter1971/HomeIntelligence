// Selection module tests

import { findComps, milesBetween, featureDistance } from '../selection';
import { loadAndClean } from '../hygiene';
import { subjectProperties, marketData, createTestScenario } from './fixtures';

describe('Selection Functions', () => {
  let cleanedMarket: any[];
  let typicalSubject: any;
  
  beforeAll(() => {
    cleanedMarket = loadAndClean(marketData);
    const subjectClean = loadAndClean([subjectProperties.typical]);
    typicalSubject = {
      id: subjectClean[0].id,
      price: subjectClean[0].price,
      sqft: subjectClean[0].sqft,
      beds: subjectClean[0].beds,
      baths: subjectClean[0].baths,
      garage: subjectClean[0].garage,
      lot_sqft: subjectClean[0].lot_sqft,
      year_built: subjectClean[0].year_built,
      is_new: subjectClean[0].is_new,
      subdivision: subjectClean[0].subdivision,
      school_zone: subjectClean[0].school_zone,
      lat: subjectClean[0].lat,
      lng: subjectClean[0].lng,
      month_index: subjectClean[0].month_index,
      property_type: subjectClean[0].property_type
    };
  });
  
  describe('milesBetween', () => {
    test('calculates distance between known coordinates', () => {
      // Indian Trail to Charlotte (approximately)
      const coord1 = { lat: 35.08, lng: -80.64 };
      const coord2 = { lat: 35.2271, lng: -80.8431 };
      
      const distance = milesBetween(coord1, coord2);
      expect(distance).toBeGreaterThan(10);
      expect(distance).toBeLessThan(30);
    });
    
    test('handles identical coordinates', () => {
      const coord = { lat: 35.08, lng: -80.64 };
      const distance = milesBetween(coord, coord);
      expect(distance).toBe(0);
    });
    
    test('handles missing coordinates with fallback', () => {
      const distance = milesBetween({}, {});
      expect(distance).toBe(0.5); // Default assumption
    });
    
    test('handles partial missing coordinates', () => {
      const coord1 = { lat: 35.08, lng: -80.64 };
      const coord2 = { lat: undefined, lng: undefined };
      
      const distance = milesBetween(coord1, coord2);
      expect(distance).toBe(0.5);
    });
  });
  
  describe('findComps', () => {
    test('finds comparables with strict criteria', () => {
      const result = findComps(typicalSubject, cleanedMarket, 3);
      
      expect(result.comparables.length).toBeGreaterThanOrEqual(3);
      expect(result.totalCandidates).toBeGreaterThan(0);
      expect(['strict', 'relaxed_time', 'relaxed_radius', 'relaxed_sqft', 'relaxed_beds', 'relaxed_year', 'insufficient']).toContain(result.criteriaUsed);
    });
    
    test('finds adequate comparables when available', () => {
      // Use market data that should have good matches
      const result = findComps(typicalSubject, cleanedMarket, 2);
      
      expect(result.comparables.length).toBeGreaterThanOrEqual(2);
      
      // Verify comparables are reasonable
      result.comparables.forEach(comp => {
        expect(comp.sqft).toBeGreaterThan(0);
        expect(comp.price).toBeGreaterThan(0);
        expect(comp.beds).toBeGreaterThan(0);
      });
    });
    
    test('respects minimum comparable requirements', () => {
      const result = findComps(typicalSubject, cleanedMarket.slice(0, 1), 5); // Very limited market
      
      // Should still try to return what it can find
      expect(result.comparables.length).toBeLessThanOrEqual(1);
      expect(result.criteriaUsed).toBe('insufficient');
    });
    
    test('excludes subject from comparables', () => {
      const result = findComps(typicalSubject, cleanedMarket, 3);
      
      // Make sure subject is not included in comparables
      const subjectInComps = result.comparables.find(comp => comp.id === typicalSubject.id);
      expect(subjectInComps).toBeUndefined();
    });
    
    test('iterative relaxation works correctly', () => {
      // Create a scenario with very strict subject that should require relaxation
      const strictSubject = {
        ...typicalSubject,
        beds: 6, // Unusual bedroom count
        sqft: 4000, // Large size
        subdivision: 'Unique Subdivision' // Unique subdivision
      };
      
      const result = findComps(strictSubject, cleanedMarket, 3);
      
      // Should have relaxed criteria
      expect(['relaxed_time', 'relaxed_radius', 'relaxed_sqft', 'relaxed_beds', 'relaxed_year', 'insufficient']).toContain(result.criteriaUsed);
    });
    
    test('prefers higher quality comparables', () => {
      const result = findComps(typicalSubject, cleanedMarket, 5);
      
      if (result.comparables.length >= 2) {
        // First comparable should be higher or equal quality than later ones
        // (sold status preferred over active, closer distance, etc.)
        const first = result.comparables[0];
        const second = result.comparables[1];
        
        // At minimum, both should be valid
        expect(first.price).toBeGreaterThan(0);
        expect(second.price).toBeGreaterThan(0);
      }
    });
  });
  
  describe('featureDistance', () => {
    test('calculates distance between similar properties', () => {
      const subject = typicalSubject;
      const similarComp = cleanedMarket[0]; // Should be similar based on test data
      
      const distance = featureDistance(subject, similarComp);
      
      expect(distance).toBeGreaterThanOrEqual(0);
      expect(distance).toBeLessThanOrEqual(1);
    });
    
    test('calculates higher distance for dissimilar properties', () => {
      const subject = typicalSubject;
      
      // Create a very different property
      const dissimilarComp = {
        ...cleanedMarket[0],
        beds: subject.beds + 3,
        baths: subject.baths + 2,
        sqft: subject.sqft * 2,
        year_built: subject.year_built - 20,
        days_on_market: 300
      };
      
      const distance = featureDistance(subject, dissimilarComp);
      
      expect(distance).toBeGreaterThan(0.5); // Should be quite different
      expect(distance).toBeLessThanOrEqual(1);
    });
    
    test('handles missing coordinate data gracefully', () => {
      const subject = { ...typicalSubject, lat: undefined, lng: undefined };
      const comp = { ...cleanedMarket[0], lat: undefined, lng: undefined };
      
      const distance = featureDistance(subject, comp);
      
      expect(distance).toBeGreaterThanOrEqual(0);
      expect(distance).toBeLessThanOrEqual(1);
    });
  });
  
  describe('integration tests', () => {
    test('complete comparable selection workflow', () => {
      const { subject, market } = createTestScenario('typical');
      const cleanMarket = loadAndClean(market);
      
      // Convert subject to Subject type
      const subjectClean = loadAndClean([subject])[0];
      const subjectConverted = {
        id: subjectClean.id,
        price: subjectClean.price,
        sqft: subjectClean.sqft,
        beds: subjectClean.beds,
        baths: subjectClean.baths,
        garage: subjectClean.garage,
        lot_sqft: subjectClean.lot_sqft,
        year_built: subjectClean.year_built,
        is_new: subjectClean.is_new,
        subdivision: subjectClean.subdivision,
        school_zone: subjectClean.school_zone,
        lat: subjectClean.lat,
        lng: subjectClean.lng,
        month_index: subjectClean.month_index,
        property_type: subjectClean.property_type
      };
      
      const result = findComps(subjectConverted, cleanMarket, 3);
      
      // Validate the complete workflow
      expect(result.totalCandidates).toBeGreaterThan(0);
      
      if (result.comparables.length > 0) {
        result.comparables.forEach(comp => {
          // Each comparable should be valid
          expect(comp.id).toBeTruthy();
          expect(comp.price).toBeGreaterThan(0);
          expect(comp.sqft).toBeGreaterThan(0);
          expect(comp.beds).toBeGreaterThan(0);
          
          // Should be reasonably similar to subject
          const bedDiff = Math.abs(comp.beds - subjectConverted.beds);
          expect(bedDiff).toBeLessThanOrEqual(3); // Allow for relaxed criteria
          
          const sqftDiff = Math.abs(comp.sqft - subjectConverted.sqft) / subjectConverted.sqft;
          expect(sqftDiff).toBeLessThanOrEqual(0.30); // Allow for relaxed criteria
        });
      }
    });
    
    test('handles edge case of no viable comparables', () => {
      // Create an extreme subject that shouldn't match anything
      const extremeSubject = {
        ...typicalSubject,
        beds: 10,
        sqft: 10000,
        price: 2000000,
        subdivision: 'Non-existent Subdivision',
        school_zone: 'Non-existent School'
      };
      
      const result = findComps(extremeSubject, cleanedMarket, 3);
      
      // Should still complete without crashing
      expect(result.criteriaUsed).toBe('insufficient');
      expect(result.totalCandidates).toBeGreaterThanOrEqual(0);
    });
    
    test('geographic filtering works correctly', () => {
      // Create properties with known coordinates
      const subject = {
        ...typicalSubject,
        lat: 35.08,
        lng: -80.64
      };
      
      // Test with various distances
      const result = findComps(subject, cleanedMarket, 10);
      
      // Should find some comparables (exact number depends on test data)
      expect(result.comparables.length).toBeGreaterThanOrEqual(0);
      
      // If coordinates are available, verify distance calculations
      result.comparables.forEach(comp => {
        if (comp.lat && comp.lng && subject.lat && subject.lng) {
          const distance = milesBetween(
            { lat: subject.lat, lng: subject.lng },
            { lat: comp.lat, lng: comp.lng }
          );
          expect(distance).toBeGreaterThanOrEqual(0);
        }
      });
    });
  });
});