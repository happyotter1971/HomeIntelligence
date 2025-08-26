// Enhanced pricing evaluation system - Public API

export { valueSubject, type PipelineOptions } from './pipeline';
export { buildClaudePrompt, buildSimpleNarrative, generateStructuredExplanation, type StructuredExplanation } from './narrative';

// Export key types for external use
export type {
  RecordRaw,
  RecordClean,
  Subject,
  ValueResult,
  HedonicModel,
  CompAdjusted,
  NarrativeInput
} from './types';

// Export utility functions that might be useful
export {
  median,
  percentile,
  winsorize,
  robustBandPct,
  coeffVariation
} from './stats';

export { loadAndClean, sanitize } from './hygiene';
export { findComps, milesBetween } from './selection';
export { trainHedonic, predictPriceLog } from './hedonic';

// Main public API function
import { valueSubject } from './pipeline';
import { buildClaudePrompt } from './narrative';

/**
 * Complete enhanced pricing evaluation workflow
 * 
 * @param subjectRaw - Raw data for the subject property
 * @param marketRaw - Array of raw market data for comparables
 * @param options - Optional configuration
 * @returns Complete valuation result with deterministic calculations
 * 
 * @example
 * ```typescript
 * const result = await enhancedPriceEvaluation(subjectHome, marketHomes);
 * 
 * if (result.status === 'success') {
 *   console.log(`Classification: ${result.classification}`);
 *   console.log(`Confidence: ${result.confidence}%`);
 *   console.log(`Suggested Range: $${result.suggested_price_range.low.toLocaleString()} - $${result.suggested_price_range.high.toLocaleString()}`);
 * }
 * ```
 */
export async function enhancedPriceEvaluation(
  subjectRaw: any, 
  marketRaw: any[], 
  options?: any
) {
  return valueSubject(subjectRaw, marketRaw, options);
}

/**
 * Generate LLM prompt for narrative explanation
 * 
 * @param valuationResult - Result from valueSubject
 * @returns Structured prompt for Claude/ChatGPT to generate narrative
 * 
 * @example
 * ```typescript
 * const result = valueSubject(subject, market);
 * const prompt = generateNarrativePrompt(result);
 * 
 * // Send to LLM
 * const narrative = await openai.chat.completions.create({
 *   messages: [{ role: 'user', content: prompt }],
 *   temperature: 0
 * });
 * ```
 */
export function generateNarrativePrompt(valuationResult: any): string {
  const narrativeInput = {
    subject_ppsf: valuationResult.explain.band.subject_ppsf,
    median_ppsf: valuationResult.median_ppsf,
    band_pct: valuationResult.explain.band.band_pct,
    classification: valuationResult.classification,
    price_gap: valuationResult.price_gap,
    comps_count: valuationResult.model_stats?.comp_count || 0,
    range25_75: {
      p25: valuationResult.explain.band.fair_range.low / (1 - valuationResult.explain.band.band_pct) * 0.75, // Approximate P25
      p75: valuationResult.explain.band.fair_range.high / (1 + valuationResult.explain.band.band_pct) * 1.25  // Approximate P75
    }
  };
  
  return buildClaudePrompt(narrativeInput);
}

/**
 * Validation function to check if enhanced system can handle the data
 * 
 * @param subjectRaw - Raw subject property data
 * @param marketRaw - Raw market data array
 * @returns Validation result with recommendations
 */
export function validateEnhancedInputs(subjectRaw: any, marketRaw: any[]): {
  isValid: boolean;
  warnings: string[];
  recommendations: string[];
  estimatedComps: number;
} {
  const warnings: string[] = [];
  const recommendations: string[] = [];
  let isValid = true;
  
  // Validate subject property
  if (!subjectRaw) {
    warnings.push('Subject property is required');
    isValid = false;
  } else {
    if (!subjectRaw.price || subjectRaw.price <= 0) {
      warnings.push('Subject property must have valid price');
      isValid = false;
    }
    if (!subjectRaw.sqft || subjectRaw.sqft <= 0) {
      warnings.push('Subject property must have valid square footage');
      isValid = false;
    }
    if (!subjectRaw.beds || subjectRaw.beds <= 0) {
      warnings.push('Subject property must have valid bedroom count');
      isValid = false;
    }
  }
  
  // Validate market data
  if (!Array.isArray(marketRaw) || marketRaw.length === 0) {
    warnings.push('Market data is required and must be non-empty array');
    isValid = false;
  }
  
  let estimatedComps = 0;
  if (isValid && subjectRaw && marketRaw.length > 0) {
    // Estimate potential comparables
    const subjectBeds = subjectRaw.beds || 0;
    const subjectSqft = subjectRaw.sqft || 0;
    
    estimatedComps = marketRaw.filter(home => {
      if (!home.price || !home.sqft || !home.beds) return false;
      if (home.id === subjectRaw.id) return false;
      
      const bedDiff = Math.abs(home.beds - subjectBeds);
      const sqftDiff = Math.abs(home.sqft - subjectSqft) / subjectSqft;
      
      return bedDiff <= 2 && sqftDiff <= 0.25; // Relaxed criteria for estimation
    }).length;
  }
  
  // Generate recommendations
  if (estimatedComps < 3) {
    recommendations.push('Expand market data collection - need at least 3 comparable homes');
  }
  if (estimatedComps < 10) {
    recommendations.push('More market data would improve accuracy');
  }
  if (marketRaw.filter(h => h.status === 'sold').length < 10) {
    recommendations.push('More sold properties would enable hedonic model training');
  }
  
  return {
    isValid,
    warnings,
    recommendations,
    estimatedComps
  };
}

// Re-export important constants
export const ENHANCED_PRICING_VERSION = '1.0.0';
export const SUPPORTED_PROPERTY_TYPES = [
  'single-family',
  'townhome', 
  'condo',
  'duplex',
  'villa'
];

export const DEFAULT_OPTIONS = {
  minComps: 3,
  useHedonicModel: true,
  fallbackToHeuristics: true,
  maxAdjustmentPct: 25
};