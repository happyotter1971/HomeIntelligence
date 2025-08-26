// Narrative prompt builder for LLM-generated explanations

import { NarrativeInput } from './types';

export function buildClaudePrompt(input: NarrativeInput): string {
  const {
    subject_ppsf,
    median_ppsf,
    band_pct,
    classification,
    price_gap,
    comps_count,
    range25_75
  } = input;
  
  return `You are a real estate analyst providing a concise 2-sentence explanation of a home's pricing analysis. Use ONLY the provided numbers - do not perform any calculations.

Analysis Results:
- Subject home: $${subject_ppsf.toFixed(0)}/sqft
- Market median: $${median_ppsf.toFixed(0)}/sqft  
- Classification: ${classification}
- Price difference: $${price_gap.delta_ppsf.toFixed(0)}/sqft (total: $${Math.abs(price_gap.total_delta).toLocaleString()})
- Market range (25-75%): $${range25_75.p25.toFixed(0)}-$${range25_75.p75.toFixed(0)}/sqft
- Comparable homes: ${comps_count}
- Market volatility: ${(band_pct * 100).toFixed(1)}%

Instructions: Write exactly 2 sentences explaining why this home received its classification. Focus on the key pricing drivers shown in the data. Do not recalculate any numbers - just interpret what the analysis shows.

Example format:
"This home is priced [classification description] at $[X]/sqft compared to the market median of $[Y]/sqft based on [Z] comparable homes. The [describe market conditions and key factors]."

Your 2-sentence explanation:`;
}

// Alternative simplified narrative for cases with limited data
export function buildSimpleNarrative(input: NarrativeInput): string {
  const { subject_ppsf, median_ppsf, classification, comps_count } = input;
  
  const templates = {
    'Below': `This home is priced below market value at $${subject_ppsf.toFixed(0)}/sqft compared to the median of $${median_ppsf.toFixed(0)}/sqft. Based on ${comps_count} comparable properties, this represents a potential value opportunity for buyers.`,
    
    'Market Fair': `This home is fairly priced at $${subject_ppsf.toFixed(0)}/sqft, closely aligned with the market median of $${median_ppsf.toFixed(0)}/sqft. The analysis of ${comps_count} comparable homes suggests this pricing reflects current market conditions.`,
    
    'Above': `This home is priced above market at $${subject_ppsf.toFixed(0)}/sqft compared to the median of $${median_ppsf.toFixed(0)}/sqft. Among ${comps_count} comparable properties, this pricing may reflect premium features or market positioning.`,
    
    'Insufficient Data': `Insufficient comparable data prevents a reliable market analysis for this property. Additional comparable sales data would be needed to establish accurate pricing benchmarks.`
  };
  
  return templates[classification as keyof typeof templates] || templates['Insufficient Data'];
}

// Generate structured explanation data for UI display
export interface StructuredExplanation {
  headline: string;
  keyPoints: string[];
  technicalDetails: string[];
  marketContext: string;
  confidenceNote: string;
}

export function generateStructuredExplanation(input: NarrativeInput, confidence: number): StructuredExplanation {
  const { subject_ppsf, median_ppsf, classification, price_gap, comps_count, band_pct } = input;
  
  const priceDiffPct = ((Math.abs(price_gap.delta_ppsf) / median_ppsf) * 100);
  
  // Headline based on classification
  const headlines = {
    'Below': `Below Market - Priced ${priceDiffPct.toFixed(1)}% Under Median`,
    'Market Fair': `Fair Market Pricing - Within Normal Range`,
    'Above': `Premium Pricing - ${priceDiffPct.toFixed(1)}% Above Market`,
    'Insufficient Data': 'Insufficient Data for Analysis'
  };
  
  const headline = headlines[classification as keyof typeof headlines] || headlines['Insufficient Data'];
  
  // Key points
  const keyPoints = [
    `Subject home: $${subject_ppsf.toFixed(0)} per square foot`,
    `Market median: $${median_ppsf.toFixed(0)} per square foot`,
    `Price difference: $${Math.abs(price_gap.total_delta).toLocaleString()} ${price_gap.total_delta >= 0 ? 'above' : 'below'} median`,
    `Analysis based on ${comps_count} comparable home${comps_count !== 1 ? 's' : ''}`
  ];
  
  // Technical details
  const technicalDetails = [
    `Market volatility: ${(band_pct * 100).toFixed(1)}% (${band_pct > 0.10 ? 'high' : band_pct > 0.05 ? 'moderate' : 'low'})`,
    `Price variance: $${Math.abs(price_gap.delta_ppsf).toFixed(0)}/sqft from median`,
    `Classification threshold: ±${Math.max(5, band_pct * 100).toFixed(1)}%`
  ];
  
  // Market context
  let marketContext = '';
  if (band_pct > 0.15) {
    marketContext = 'High market volatility suggests diverse pricing across comparable properties.';
  } else if (band_pct > 0.08) {
    marketContext = 'Moderate market volatility indicates some pricing variation among comparables.';
  } else {
    marketContext = 'Low market volatility indicates consistent pricing across comparable properties.';
  }
  
  // Confidence note
  let confidenceNote = '';
  if (confidence >= 80) {
    confidenceNote = `High confidence analysis based on strong comparable data and consistent market patterns.`;
  } else if (confidence >= 60) {
    confidenceNote = `Moderate confidence analysis with adequate comparable data.`;
  } else if (confidence >= 30) {
    confidenceNote = `Lower confidence due to limited comparables or market inconsistencies.`;
  } else {
    confidenceNote = `Very low confidence - results should be interpreted with caution.`;
  }
  
  return {
    headline,
    keyPoints,
    technicalDetails,
    marketContext,
    confidenceNote
  };
}

// Format price range for display
export function formatPriceRange(low: number, high: number, sqft: number): string {
  const lowPpsf = low / sqft;
  const highPpsf = high / sqft;
  
  return `$${low.toLocaleString()} - $${high.toLocaleString()} ($${lowPpsf.toFixed(0)}-$${highPpsf.toFixed(0)}/sqft)`;
}

// Generate recommendations based on analysis
export function generateRecommendations(
  classification: string,
  confidence: number,
  priceGap: { delta_ppsf: number; total_delta: number }
): string[] {
  const recommendations: string[] = [];
  
  switch (classification) {
    case 'Below':
      recommendations.push('This may represent a value opportunity');
      recommendations.push('Verify property condition and features');
      if (Math.abs(priceGap.total_delta) > 20000) {
        recommendations.push('Consider factors that may justify the lower pricing');
      }
      break;
      
    case 'Above':
      recommendations.push('Consider negotiating the price');
      recommendations.push('Verify premium features that justify higher pricing');
      if (Math.abs(priceGap.total_delta) > 30000) {
        recommendations.push('Significant premium - carefully evaluate value proposition');
      }
      break;
      
    case 'Market Fair':
      recommendations.push('Pricing appears aligned with current market');
      recommendations.push('Standard market conditions apply');
      break;
      
    default:
      recommendations.push('Seek additional comparable data');
      recommendations.push('Consider professional appraisal');
  }
  
  // Confidence-based recommendations
  if (confidence < 60) {
    recommendations.push('Low confidence - verify with additional market data');
  }
  
  return recommendations;
}