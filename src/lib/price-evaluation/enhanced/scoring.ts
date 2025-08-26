// Quality control penalties and confidence scoring

import { Subject, CompAdjusted, QualityPenalties, ConfidenceComponents } from './types';
import { featureDistance } from './selection';
import { coeffVariation, clamp } from './stats';

export function calculatePenalties(
  adjustedComps: CompAdjusted[],
  subject: Subject,
  medianPpsf: number
): QualityPenalties {
  let largeAdjustments = 0;
  let timeDrift = 0;
  let sqftMismatch = 0;
  
  // Penalty 1: Large adjustments (>12%)
  const hasLargeAdjustments = adjustedComps.some(comp => 
    Math.abs(comp.total_adjustment_pct) > 12
  );
  if (hasLargeAdjustments) {
    largeAdjustments = 5;
  }
  
  // Penalty 2: Excessive time drift (avg >3%)
  if (adjustedComps.length > 0) {
    const avgTimeAdjPct = adjustedComps.reduce((sum, comp) => 
      sum + Math.abs(comp.time_adj_pct), 0
    ) / adjustedComps.length;
    
    if (avgTimeAdjPct > 3) {
      timeDrift = 5;
    }
  }
  
  // Penalty 3: Square footage mismatch (implied sqft variance >10%)
  if (medianPpsf > 0) {
    const impliedSqft = subject.price / medianPpsf;
    const sqftVariance = Math.abs(impliedSqft - subject.sqft) / subject.sqft;
    
    if (sqftVariance > 0.10) {
      sqftMismatch = 10;
    }
  }
  
  return {
    large_adjustments: largeAdjustments,
    time_drift: timeDrift,
    sqft_mismatch: sqftMismatch
  };
}

export function confidenceScore(
  ppsfAdjustedList: number[],
  adjustedComps: CompAdjusted[],
  subject: Subject,
  penalties: QualityPenalties
): ConfidenceComponents {
  const n = ppsfAdjustedList.length;
  
  // Sample Size Score: S = min(40, 10*ln(1+n))
  const sampleSizeScore = Math.min(40, 10 * Math.log(1 + n));
  
  // Match Quality Score: M = 30*(1 - avg(featureDistance))
  let avgFeatureDistance = 0;
  if (adjustedComps.length > 0) {
    const distances = adjustedComps.map(comp => 
      featureDistance(subject, comp.comp_record)
    );
    avgFeatureDistance = distances.reduce((sum, d) => sum + d, 0) / distances.length;
  }
  const matchQualityScore = 30 * (1 - avgFeatureDistance);
  
  // Consistency Score: C = 30*(1 - cv/0.2)
  const cv = Math.min(0.2, coeffVariation(ppsfAdjustedList));
  const consistencyScore = 30 * (1 - cv / 0.2);
  
  // Total penalties
  const totalPenalties = penalties.large_adjustments + penalties.time_drift + penalties.sqft_mismatch;
  
  // Final confidence: clamp(S + M + C - penalties, 0, 100)
  const finalConfidence = clamp(
    sampleSizeScore + matchQualityScore + consistencyScore - totalPenalties,
    0,
    100
  );
  
  return {
    sample_size_score: sampleSizeScore,
    match_quality_score: matchQualityScore,
    consistency_score: consistencyScore,
    penalties: totalPenalties,
    final_confidence: finalConfidence
  };
}

// Additional quality metrics
export function calculateDataQualityMetrics(
  adjustedComps: CompAdjusted[],
  subject: Subject
): {
  avgDistance: number;
  avgDaysOnMarket: number;
  statusDistribution: Record<string, number>;
  priceSpread: number;
  geographicSpread: number;
} {
  if (adjustedComps.length === 0) {
    return {
      avgDistance: 0,
      avgDaysOnMarket: 0,
      statusDistribution: {},
      priceSpread: 0,
      geographicSpread: 0
    };
  }
  
  // Average distance
  const avgDistance = adjustedComps.reduce((sum, comp) => 
    sum + comp.distance_miles, 0
  ) / adjustedComps.length;
  
  // Average days on market
  const avgDaysOnMarket = adjustedComps.reduce((sum, comp) => 
    sum + comp.comp_record.days_on_market, 0
  ) / adjustedComps.length;
  
  // Status distribution
  const statusDistribution: Record<string, number> = {};
  adjustedComps.forEach(comp => {
    const status = comp.comp_record.status;
    statusDistribution[status] = (statusDistribution[status] || 0) + 1;
  });
  
  // Price spread (coefficient of variation of adjusted prices)
  const adjustedPrices = adjustedComps.map(comp => comp.price_adj);
  const priceSpread = coeffVariation(adjustedPrices);
  
  // Geographic spread (max distance between any two comps)
  let maxDistance = 0;
  for (let i = 0; i < adjustedComps.length; i++) {
    for (let j = i + 1; j < adjustedComps.length; j++) {
      const comp1 = adjustedComps[i].comp_record;
      const comp2 = adjustedComps[j].comp_record;
      
      if (comp1.lat && comp1.lng && comp2.lat && comp2.lng) {
        const distance = haversineDistance(
          comp1.lat, comp1.lng,
          comp2.lat, comp2.lng
        );
        maxDistance = Math.max(maxDistance, distance);
      }
    }
  }
  
  return {
    avgDistance,
    avgDaysOnMarket,
    statusDistribution,
    priceSpread,
    geographicSpread: maxDistance
  };
}

// Risk assessment for the valuation
export function assessValuationRisk(
  adjustedComps: CompAdjusted[],
  subject: Subject,
  confidence: number,
  medianPpsf: number
): {
  riskLevel: 'low' | 'moderate' | 'high' | 'very_high';
  riskFactors: string[];
  recommendations: string[];
} {
  const riskFactors: string[] = [];
  const recommendations: string[] = [];
  
  // Low confidence
  if (confidence < 50) {
    riskFactors.push('Low confidence score');
    recommendations.push('Seek additional comparable properties');
  }
  
  // Few comparables
  if (adjustedComps.length < 3) {
    riskFactors.push('Insufficient comparable sales');
    recommendations.push('Expand search criteria or timeline');
  }
  
  // Large price adjustments
  const hasLargeAdj = adjustedComps.some(comp => Math.abs(comp.total_adjustment_pct) > 15);
  if (hasLargeAdj) {
    riskFactors.push('Large price adjustments required');
    recommendations.push('Verify property feature differences');
  }
  
  // Wide price spread
  const ppsfValues = adjustedComps.map(comp => comp.ppsf_adj);
  const cv = coeffVariation(ppsfValues);
  if (cv > 0.15) {
    riskFactors.push('High price variability in comparables');
    recommendations.push('Review comparable selection criteria');
  }
  
  // Extreme subject price
  if (medianPpsf > 0) {
    const subjectPpsf = subject.price / subject.sqft;
    const deviation = Math.abs(subjectPpsf - medianPpsf) / medianPpsf;
    if (deviation > 0.20) {
      riskFactors.push('Subject price significantly differs from market');
      recommendations.push('Verify subject property features and pricing');
    }
  }
  
  // Old comparables
  const avgAge = adjustedComps.reduce((sum, comp) => 
    sum + comp.comp_record.days_on_market, 0
  ) / adjustedComps.length;
  if (avgAge > 180) {
    riskFactors.push('Comparables are relatively old');
    recommendations.push('Seek more recent comparable sales');
  }
  
  // Determine risk level
  let riskLevel: 'low' | 'moderate' | 'high' | 'very_high';
  if (riskFactors.length === 0 && confidence >= 80) {
    riskLevel = 'low';
  } else if (riskFactors.length <= 2 && confidence >= 60) {
    riskLevel = 'moderate';
  } else if (riskFactors.length <= 4 && confidence >= 30) {
    riskLevel = 'high';
  } else {
    riskLevel = 'very_high';
  }
  
  return {
    riskLevel,
    riskFactors,
    recommendations
  };
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959; // Earth radius in miles
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// Confidence band calculation
export function calculateConfidenceBands(
  medianPpsf: number,
  confidenceScore: number,
  sampleSize: number
): {
  narrowBand: { low: number; high: number };
  wideBand: { low: number; high: number };
  bandWidth: number;
} {
  // Base band width from confidence
  const baseWidth = Math.max(0.02, (100 - confidenceScore) / 1000);
  
  // Sample size adjustment
  const sampleAdjustment = Math.max(0.01, 0.15 / Math.sqrt(sampleSize));
  
  // Final band width
  const bandWidth = Math.min(0.25, baseWidth + sampleAdjustment);
  
  const narrowBand = {
    low: medianPpsf * (1 - bandWidth),
    high: medianPpsf * (1 + bandWidth)
  };
  
  const wideBand = {
    low: medianPpsf * (1 - bandWidth * 1.5),
    high: medianPpsf * (1 + bandWidth * 1.5)
  };
  
  return {
    narrowBand,
    wideBand,
    bandWidth
  };
}