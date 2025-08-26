// Main pricing pipeline integrating all enhanced components

import { RecordRaw, Subject, ValueResult, HedonicModel } from './types';
import { loadAndClean, sanitize } from './hygiene';
import { findComps } from './selection';
import { trainHedonic, extractFeatures, predictPriceLog } from './hedonic';
import { adjustComparables } from './adjustments';
import { calculatePenalties, confidenceScore } from './scoring';
import { winsorize, median, percentile, robustBandPct, clamp } from './stats';

export interface PipelineOptions {
  minComps?: number;
  useHedonicModel?: boolean;
  fallbackToHeuristics?: boolean;
  maxAdjustmentPct?: number;
}

export function valueSubject(
  subjectRaw: RecordRaw,
  marketRaw: RecordRaw[],
  options: PipelineOptions = {}
): ValueResult {
  const {
    minComps = 2, // Reduced from 3 to 2 to handle smaller datasets
    useHedonicModel = true,
    fallbackToHeuristics = true,
    maxAdjustmentPct = 25
  } = options;

  try {
    console.log(`🏠 Starting enhanced pricing evaluation for ${subjectRaw.id}`);
    
    // Step 1: Data hygiene and cleaning
    const cleanedMarket = loadAndClean(marketRaw);
    const subjectClean = sanitize(subjectRaw);
    
    if (!subjectClean) {
      return createInsufficientDataResult('Subject property failed data validation');
    }
    
    console.log(`📊 Data cleaned: ${marketRaw.length} raw → ${cleanedMarket.length} clean records`);
    
    // Step 2: Convert subject to Subject type
    const subject: Subject = {
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
    
    // Step 3: Find comparable properties
    const compResult = findComps(subject, cleanedMarket, minComps);
    console.log(`🔍 Found ${compResult.comparables.length} comparables using ${compResult.criteriaUsed} criteria`);
    
    if (compResult.comparables.length < minComps) {
      return createInsufficientDataResult(
        `Only found ${compResult.comparables.length} comparable properties (need ${minComps})`
      );
    }
    
    // Step 4: Train hedonic model (if requested and sufficient sold data)
    let hedonicModel: HedonicModel | undefined;
    if (useHedonicModel) {
      try {
        const soldRecords = cleanedMarket.filter(r => r.status === 'sold');
        if (soldRecords.length >= 10) {
          hedonicModel = trainHedonic(soldRecords);
          console.log(`🤖 Hedonic model trained on ${soldRecords.length} sold properties`);
        } else {
          console.log(`⚠️  Insufficient sold data for hedonic model: ${soldRecords.length} records`);
        }
      } catch (error) {
        console.error('Hedonic model training failed:', error);
        if (!fallbackToHeuristics) {
          return createErrorResult('Failed to train hedonic model');
        }
      }
    }
    
    // Step 5: Adjust comparable prices
    const adjustedComps = hedonicModel
      ? adjustComparables(compResult.comparables, subject, hedonicModel)
      : compResult.comparables.map(comp => ({
          id: comp.id,
          original_price: comp.price,
          price_adj: comp.price,
          ppsf_adj: comp.price_ppsf,
          total_adjustment_pct: 0,
          time_adj_pct: 0,
          other_adj_pct: 0,
          distance_miles: 0,
          comp_record: comp
        }));
    
    console.log(`📈 Price adjustments completed for ${adjustedComps.length} comparables`);
    
    // Step 6: Winsorize adjusted PPSF values
    const rawPpsfAdjusted = adjustedComps.map(c => c.ppsf_adj);
    const winsorizedPpsf = winsorize(rawPpsfAdjusted, 10, 90);
    console.log(`🎯 Winsorized PPSF: ${rawPpsfAdjusted.length} values, range $${Math.min(...winsorizedPpsf).toFixed(0)}-$${Math.max(...winsorizedPpsf).toFixed(0)}/sqft`);
    
    // Step 7: Calculate market statistics
    const medianPpsf = median(winsorizedPpsf);
    const p25Ppsf = percentile(winsorizedPpsf, 25);
    const p75Ppsf = percentile(winsorizedPpsf, 75);
    const bandPct = robustBandPct(winsorizedPpsf, medianPpsf);
    
    // Step 8: Classification and price gap
    const subjectPpsf = subject.price / subject.sqft;
    const { classification, priceGap } = classifyPrice(subjectPpsf, medianPpsf, bandPct, subject.sqft);
    
    // Step 9: Quality control and confidence scoring
    const penalties = calculatePenalties(adjustedComps, subject, medianPpsf);
    const confidenceComponents = confidenceScore(winsorizedPpsf, adjustedComps, subject, penalties);
    let finalConfidence = confidenceComponents.final_confidence;
    
    // Step 10: Dual valuation reconciliation
    const { pMed, pHed, diffPct, reconFlag } = performReconciliation(subject, medianPpsf, hedonicModel);
    
    if (reconFlag) {
      finalConfidence = Math.max(finalConfidence - 20, 0);
      console.log(`🔧 Reconciliation flag: ${diffPct.toFixed(1)}% difference, confidence reduced to ${finalConfidence}`);
    }
    
    // Step 11: Suggested price range (prediction intervals)
    const suggestedRange = calculatePriceRange(pHed || pMed, hedonicModel);
    
    // Step 12: Prepare result
    const result: ValueResult = {
      status: 'success',
      classification,
      confidence: Math.round(finalConfidence),
      median_ppsf: medianPpsf,
      suggested_price_range: suggestedRange,
      price_gap: priceGap,
      explain: {
        top3: adjustedComps
          .slice(0, 3)
          .map(c => ({
            id: c.id,
            raw_ppsf: c.comp_record.price_ppsf,
            adjusted_ppsf: c.ppsf_adj,
            distance_miles: c.distance_miles
          })),
        band: {
          median: medianPpsf,
          band_pct: bandPct,
          fair_range: {
            low: medianPpsf * (1 - bandPct),
            high: medianPpsf * (1 + bandPct)
          },
          subject_ppsf: subjectPpsf
        },
        recon: {
          p_med: pMed,
          p_hed: pHed,
          diff_pct: diffPct,
          flag: reconFlag
        }
      },
      model_stats: {
        comp_count: adjustedComps.length,
        adjusted_comps: adjustedComps,
        hedonic_model: hedonicModel,
        penalties: penalties.large_adjustments + penalties.time_drift + penalties.sqft_mismatch
      }
    };
    
    console.log(`✅ Evaluation complete: ${classification} (${finalConfidence}% confidence)`);
    return result;
    
  } catch (error) {
    console.error('Pipeline error:', error);
    return createErrorResult(error instanceof Error ? error.message : 'Unknown pipeline error');
  }
}

function classifyPrice(
  subjectPpsf: number,
  medianPpsf: number,
  bandPct: number,
  subjectSqft: number
): {
  classification: ValueResult['classification'];
  priceGap: ValueResult['price_gap'];
} {
  const deltaPpsf = subjectPpsf - medianPpsf;
  const totalDelta = deltaPpsf * subjectSqft;
  const thresholdPct = Math.max(0.05, bandPct); // Use band or minimum 5%
  
  let classification: ValueResult['classification'];
  
  if (deltaPpsf < -medianPpsf * thresholdPct) {
    classification = 'Below';
  } else if (deltaPpsf > medianPpsf * thresholdPct) {
    classification = 'Above';
  } else {
    classification = 'Market Fair';
  }
  
  return {
    classification,
    priceGap: {
      delta_ppsf: deltaPpsf,
      total_delta: totalDelta
    }
  };
}

function performReconciliation(
  subject: Subject,
  medianPpsf: number,
  hedonicModel?: HedonicModel
): {
  pMed: number;
  pHed: number;
  diffPct: number;
  reconFlag: boolean;
} {
  const pMed = medianPpsf * subject.sqft;
  
  let pHed = pMed; // Default to median if no hedonic model
  if (hedonicModel) {
    try {
      const features = extractFeatures({
        ...subject,
        // Convert to RecordClean format
        status: 'active' as const,
        address: '',
        dedupe_id: subject.id,
        list_date: new Date(),
        sold_date: undefined,
        days_on_market: 0,
        price_ppsf: subject.price / subject.sqft,
      });
      const logPrice = predictPriceLog(features, hedonicModel);
      pHed = Math.exp(logPrice);
    } catch (error) {
      console.warn('Hedonic prediction failed:', error);
    }
  }
  
  const avgPrice = (pMed + pHed) / 2;
  const diffPct = avgPrice > 0 ? Math.abs(pMed - pHed) / avgPrice * 100 : 0;
  const reconFlag = diffPct > 5;
  
  return { pMed, pHed, diffPct, reconFlag };
}

function calculatePriceRange(
  basePrice: number,
  hedonicModel?: HedonicModel
): { low: number; high: number } {
  // Use hedonic RMSE if available for prediction interval
  if (hedonicModel && hedonicModel.rmseLog > 0) {
    const tstar = 1.645; // 90% prediction interval
    const multiplier = Math.exp(tstar * hedonicModel.rmseLog);
    return {
      low: Math.round(basePrice / multiplier),
      high: Math.round(basePrice * multiplier)
    };
  } else {
    // Fallback: ±15% range
    return {
      low: Math.round(basePrice * 0.85),
      high: Math.round(basePrice * 1.15)
    };
  }
}

// Helper functions for error cases
function createInsufficientDataResult(message: string): ValueResult {
  return {
    status: 'insufficient_data',
    classification: 'Insufficient Data',
    confidence: 0,
    median_ppsf: 0,
    suggested_price_range: { low: 0, high: 0 },
    price_gap: { delta_ppsf: 0, total_delta: 0 },
    explain: {
      top3: [],
      band: {
        median: 0,
        band_pct: 0,
        fair_range: { low: 0, high: 0 },
        subject_ppsf: 0
      },
      recon: { p_med: 0, p_hed: 0, diff_pct: 0, flag: false }
    },
    model_stats: {
      comp_count: 0,
      adjusted_comps: [],
      penalties: 0
    }
  };
}

function createErrorResult(message: string): ValueResult {
  console.error('Pipeline error:', message);
  return {
    status: 'error',
    classification: 'Insufficient Data',
    confidence: 0,
    median_ppsf: 0,
    suggested_price_range: { low: 0, high: 0 },
    price_gap: { delta_ppsf: 0, total_delta: 0 },
    explain: {
      top3: [],
      band: {
        median: 0,
        band_pct: 0,
        fair_range: { low: 0, high: 0 },
        subject_ppsf: 0
      },
      recon: { p_med: 0, p_hed: 0, diff_pct: 0, flag: false }
    },
    model_stats: {
      comp_count: 0,
      adjusted_comps: [],
      penalties: 0
    }
  };
}