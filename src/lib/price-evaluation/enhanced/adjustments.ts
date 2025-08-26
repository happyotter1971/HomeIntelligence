// Price adjustment system using trained hedonic model coefficients

import { RecordClean, Subject, HedonicModel, CompAdjusted } from './types';
import { extractFeatures } from './hedonic';
import { milesBetween } from './selection';

export function adjustCompPrice(
  comp: RecordClean,
  subject: Subject,
  model: HedonicModel
): CompAdjusted {
  try {
    // Get feature vectors for both properties
    const compFeatures = extractFeatures(comp);
    const subjectFeaturesAtCompTime = extractFeatures(
      {
        ...subject,
        month_index: comp.month_index,
        // Convert subject to RecordClean format for feature extraction
        status: 'active' as const,
        address: '',
        subdivision: subject.subdivision,
        school_zone: subject.school_zone,
        dedupe_id: subject.id,
        list_date: new Date(),
        days_on_market: 0,
        price_ppsf: subject.price / subject.sqft,
        property_type: subject.property_type
      },
      undefined,
      comp.month_index // Force comp's month
    );
    
    // Calculate feature differences
    const deltaOther = calculateFeatureDelta(compFeatures, subjectFeaturesAtCompTime, model, ['month']);
    
    // Isolate time adjustment
    const monthCoeff = model.coef['month'] || 0;
    const monthDiff = subject.month_index - comp.month_index;
    const timeAdjPct = Math.exp(monthCoeff * monthDiff) - 1;
    
    // Total adjustment percentage
    const totalAdjPct = Math.exp(deltaOther + monthCoeff * monthDiff) - 1;
    const otherAdjPct = totalAdjPct - timeAdjPct;
    
    // Apply adjustments
    const priceAdj = comp.price * (1 + totalAdjPct);
    const ppsfAdj = priceAdj / comp.sqft;
    
    // Calculate distance
    const distance = milesBetween(
      { lat: subject.lat, lng: subject.lng },
      { lat: comp.lat, lng: comp.lng }
    );
    
    return {
      id: comp.id,
      original_price: comp.price,
      price_adj: priceAdj,
      ppsf_adj: ppsfAdj,
      total_adjustment_pct: totalAdjPct * 100, // Convert to percentage
      time_adj_pct: timeAdjPct * 100,
      other_adj_pct: otherAdjPct * 100,
      distance_miles: distance,
      comp_record: comp
    };
  } catch (error) {
    console.error('Error adjusting comp price:', error);
    
    // Fallback: minimal adjustment
    return {
      id: comp.id,
      original_price: comp.price,
      price_adj: comp.price,
      ppsf_adj: comp.price_ppsf,
      total_adjustment_pct: 0,
      time_adj_pct: 0,
      other_adj_pct: 0,
      distance_miles: milesBetween(
        { lat: subject.lat, lng: subject.lng },
        { lat: comp.lat, lng: comp.lng }
      ),
      comp_record: comp
    };
  }
}

function calculateFeatureDelta(
  compFeatures: any,
  subjectFeatures: any,
  model: HedonicModel,
  excludeFeatures: string[] = []
): number {
  let delta = 0;
  
  for (const featureName of model.features) {
    if (excludeFeatures.includes(featureName)) continue;
    
    const coefficient = model.coef[featureName] || 0;
    const compValue = compFeatures[featureName] || 0;
    const subjectValue = subjectFeatures[featureName] || 0;
    const difference = subjectValue - compValue;
    
    delta += coefficient * difference;
  }
  
  return delta;
}

// Batch adjustment function for multiple comparables
export function adjustComparables(
  comparables: RecordClean[],
  subject: Subject,
  model: HedonicModel
): CompAdjusted[] {
  return comparables.map(comp => adjustCompPrice(comp, subject, model));
}

// Alternative adjustment method using simple heuristics (fallback)
export function adjustCompPriceHeuristic(
  comp: RecordClean,
  subject: Subject
): CompAdjusted {
  let adjustmentAmount = 0;
  let adjustmentDetails: string[] = [];
  
  // Square footage adjustment
  const sqftDiff = subject.sqft - comp.sqft;
  if (Math.abs(sqftDiff) > 50) { // Only adjust if significant difference
    const sqftAdjPerSqft = 15; // $15 per sqft difference
    const sqftAdj = sqftDiff * sqftAdjPerSqft;
    adjustmentAmount += sqftAdj;
    adjustmentDetails.push(`Sqft: ${sqftDiff > 0 ? '+' : ''}${sqftAdj.toLocaleString()}`);
  }
  
  // Bedroom adjustment
  const bedDiff = subject.beds - comp.beds;
  if (bedDiff !== 0) {
    const bedAdj = bedDiff * 8000; // $8K per bedroom
    adjustmentAmount += bedAdj;
    adjustmentDetails.push(`Beds: ${bedDiff > 0 ? '+' : ''}${bedAdj.toLocaleString()}`);
  }
  
  // Bathroom adjustment
  const bathDiff = subject.baths - comp.baths;
  if (Math.abs(bathDiff) >= 0.5) {
    const bathAdj = bathDiff * 12000; // $12K per full bathroom
    adjustmentAmount += bathAdj;
    adjustmentDetails.push(`Baths: ${bathDiff > 0 ? '+' : ''}${bathAdj.toLocaleString()}`);
  }
  
  // Garage adjustment
  const garageDiff = subject.garage - comp.garage;
  if (garageDiff !== 0) {
    const garageAdj = garageDiff * 5000; // $5K per bay
    adjustmentAmount += garageAdj;
    adjustmentDetails.push(`Garage: ${garageDiff > 0 ? '+' : ''}${garageAdj.toLocaleString()}`);
  }
  
  // New construction premium
  if (subject.is_new && !comp.is_new) {
    const newPremium = subject.sqft * 10; // $10/sqft new construction premium
    adjustmentAmount += newPremium;
    adjustmentDetails.push(`New: +${newPremium.toLocaleString()}`);
  } else if (!subject.is_new && comp.is_new) {
    const newDiscount = subject.sqft * -10;
    adjustmentAmount += newDiscount;
    adjustmentDetails.push(`Resale: ${newDiscount.toLocaleString()}`);
  }
  
  // Time adjustment (simple monthly appreciation)
  const monthDiff = subject.month_index - comp.month_index;
  if (Math.abs(monthDiff) > 1) {
    const monthlyAppreciation = 0.003; // 0.3% per month
    const timeAdj = comp.price * monthlyAppreciation * monthDiff;
    adjustmentAmount += timeAdj;
    adjustmentDetails.push(`Time: ${monthDiff > 0 ? '+' : ''}${timeAdj.toLocaleString()}`);
  }
  
  // Apply adjustments
  const adjustedPrice = comp.price + adjustmentAmount;
  const totalAdjPct = (adjustmentAmount / comp.price) * 100;
  const timeAdjPct = monthDiff * 0.3; // 0.3% per month
  const otherAdjPct = totalAdjPct - timeAdjPct;
  
  const distance = milesBetween(
    { lat: subject.lat, lng: subject.lng },
    { lat: comp.lat, lng: comp.lng }
  );
  
  return {
    id: comp.id,
    original_price: comp.price,
    price_adj: adjustedPrice,
    ppsf_adj: adjustedPrice / comp.sqft,
    total_adjustment_pct: totalAdjPct,
    time_adj_pct: timeAdjPct,
    other_adj_pct: otherAdjPct,
    distance_miles: distance,
    comp_record: comp
  };
}

// Validation function for adjustment magnitudes
export function validateAdjustments(adjustedComps: CompAdjusted[]): {
  valid: boolean;
  warnings: string[];
  largeAdjustments: CompAdjusted[];
} {
  const warnings: string[] = [];
  const largeAdjustments: CompAdjusted[] = [];
  let valid = true;
  
  for (const comp of adjustedComps) {
    // Check for extreme adjustments
    if (Math.abs(comp.total_adjustment_pct) > 25) {
      warnings.push(`Large adjustment on ${comp.id}: ${comp.total_adjustment_pct.toFixed(1)}%`);
      largeAdjustments.push(comp);
      valid = false;
    }
    
    // Check for extreme time adjustments
    if (Math.abs(comp.time_adj_pct) > 10) {
      warnings.push(`Large time adjustment on ${comp.id}: ${comp.time_adj_pct.toFixed(1)}%`);
    }
    
    // Check for negative adjusted prices
    if (comp.price_adj <= 0) {
      warnings.push(`Negative adjusted price on ${comp.id}: $${comp.price_adj.toLocaleString()}`);
      valid = false;
    }
    
    // Check for extreme price per square foot
    if (comp.ppsf_adj < 50 || comp.ppsf_adj > 500) {
      warnings.push(`Extreme adjusted PPSF on ${comp.id}: $${comp.ppsf_adj.toFixed(0)}/sqft`);
    }
  }
  
  return {
    valid,
    warnings,
    largeAdjustments
  };
}

// Calculate adjustment statistics
export function getAdjustmentStats(adjustedComps: CompAdjusted[]): {
  avgTotalAdjPct: number;
  avgTimeAdjPct: number;
  maxAdjPct: number;
  minAdjPct: number;
  stdAdjPct: number;
} {
  if (adjustedComps.length === 0) {
    return {
      avgTotalAdjPct: 0,
      avgTimeAdjPct: 0,
      maxAdjPct: 0,
      minAdjPct: 0,
      stdAdjPct: 0
    };
  }
  
  const totalAdjs = adjustedComps.map(c => Math.abs(c.total_adjustment_pct));
  const timeAdjs = adjustedComps.map(c => Math.abs(c.time_adj_pct));
  
  const avgTotalAdjPct = totalAdjs.reduce((sum, adj) => sum + adj, 0) / totalAdjs.length;
  const avgTimeAdjPct = timeAdjs.reduce((sum, adj) => sum + adj, 0) / timeAdjs.length;
  const maxAdjPct = Math.max(...totalAdjs);
  const minAdjPct = Math.min(...totalAdjs);
  
  const variance = totalAdjs.reduce((sum, adj) => sum + Math.pow(adj - avgTotalAdjPct, 2), 0) / totalAdjs.length;
  const stdAdjPct = Math.sqrt(variance);
  
  return {
    avgTotalAdjPct,
    avgTimeAdjPct,
    maxAdjPct,
    minAdjPct,
    stdAdjPct
  };
}