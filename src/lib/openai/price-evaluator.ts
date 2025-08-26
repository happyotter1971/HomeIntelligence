import { getOpenAIClient } from './client';
import { 
  PriceEvaluation, 
  EvaluationRequest,
  SubjectProperty,
  ComparableProperty,
  MarketAggregates 
} from './types';

const SYSTEM_PROMPT = `You are a pricing analyst for a North Carolina homebuilder. Use only the structured data provided in the user message. Do not browse or assume facts. Compare the subject property to the supplied competitive set within the same micro-market. Prefer recent, geographically close, similar-spec comps.
Perform clear arithmetic when asked, yet keep explanations concise.
Never reveal chain-of-thought. Provide only final answers and brief evidence points.
Avoid sensitive attributes, protected-class inferences, or steering. Base conclusions on housing data only.`;

function buildUserPrompt(request: EvaluationRequest): string {
  const { subject, comps, aggregates } = request;
  
  return `Evaluate the pricing for the subject property against the provided competitive set.

Subject:
${JSON.stringify(subject, null, 2)}

CompetitiveSet:
${JSON.stringify(comps, null, 2)}

${aggregates ? `Aggregates:
${JSON.stringify(aggregates, null, 2)}` : ''}

Instructions:
1. Compute subject $/sqft and compare to comps filtered to: same city and ZIP, similar community tier if provided, beds within ±1, heated_sqft within ±15%, and status in {spec, QM, closed within 90 days}. Prefer closed or pending over active.
2. Adjust comparisons for material feature deltas using simple additive heuristics if no regression coefficients are provided:
   • +/- $12–$20 per sqft for significant spec/finish tier differences,
   • +$8–$12 per sqft premium for new construction vs resale in same micro-area,
   • Garage space: $5K per additional bay,
   • Lot size premium only if notable or unique, $0.50–$2 per sqft of extra usable lot,
   • Primary suite on main: $8K–$15K in 2-story plans if typical for area.
   If model coefficients are provided in Aggregates, use those instead.
3. Consider incentives as effective price reductions. Convert buydowns/credits to a dollar-equivalent and subtract from list_price to compute an effective_price. State your assumptions briefly.
4. Classify using these EXACT criteria based on price per square foot comparison to market median:
   • "below_market": Subject price/sqft is more than 5% BELOW the comparable median (good deal for buyers)
   • "market_fair": Subject price/sqft is within ±5% of the comparable median (fairly priced)
   • "above_market": Subject price/sqft is more than 5% ABOVE the comparable median (overpriced)
   • "insufficient_data": If filtered_comp_count < 3 or required fields missing
   Provide 0–100 confidence score. Higher confidence for larger sample sizes and tighter comp quality.
5. Return only JSON, no commentary. Output exactly the schema below:

{
  "classification": "below_market | market_fair | above_market | insufficient_data",
  "subject_metrics": {
    "list_price": 0,
    "effective_price": 0,
    "heated_sqft": 0,
    "price_per_sqft": 0
  },
  "market_baselines": {
    "filtered_comp_count": 0,
    "comp_price_per_sqft": { "p25": 0, "median": 0, "p75": 0 },
    "comp_list_price": { "p25": 0, "median": 0, "p75": 0 }
  },
  "price_gap": {
    "vs_median_ppsf": 0,
    "vs_median_list": 0
  },
  "suggested_price_range": { "low": 0, "high": 0 },
  "key_comparables": [
    { "address": "", "status": "", "ppsf": 0, "distance_miles": 0, "notes": "" }
  ],
  "assumptions": [ "short bullet", "short bullet" ],
  "confidence": 0,
  "evidence": [ "1-2 line justification using numbers only" ]
}`;
}

export async function evaluatePrice(request: EvaluationRequest): Promise<PriceEvaluation> {
  try {
    const openai = getOpenAIClient();
    const userPrompt = buildUserPrompt(request);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.2,
      max_tokens: 800,
      response_format: { type: 'json_object' }
    });

    const content = completion.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const evaluation = JSON.parse(content) as PriceEvaluation;
    
    // Validate required fields
    if (!evaluation.classification || !evaluation.confidence) {
      throw new Error('Invalid evaluation response structure');
    }

    // Post-process validation to ensure logic is sound
    const validatedEvaluation = validateEvaluationLogic(evaluation, request);
    
    return validatedEvaluation;
  } catch (error) {
    console.error('Error evaluating price:', error);
    
    // Return a fallback evaluation in case of error
    return {
      classification: 'insufficient_data',
      subject_metrics: {
        list_price: request.subject.list_price || 0,
        effective_price: request.subject.list_price || 0,
        heated_sqft: request.subject.heated_sqft || 0,
        price_per_sqft: 0
      },
      market_baselines: {
        filtered_comp_count: 0,
        comp_price_per_sqft: { p25: 0, median: 0, p75: 0 },
        comp_list_price: { p25: 0, median: 0, p75: 0 }
      },
      price_gap: {
        vs_median_ppsf: 0,
        vs_median_list: 0
      },
      suggested_price_range: { low: 0, high: 0 },
      key_comparables: [],
      assumptions: ['Error occurred during evaluation'],
      confidence: 0,
      evidence: ['Unable to complete evaluation']
    };
  }
}

export function calculateEffectivePrice(
  listPrice: number,
  incentives?: SubjectProperty['incentives']
): number {
  if (!incentives) return listPrice;

  let reduction = 0;
  
  if (incentives.closing_cost_help) {
    reduction += incentives.closing_cost_help;
  }
  
  if (incentives.lender_credits) {
    reduction += incentives.lender_credits;
  }
  
  if (incentives.design_studio_credits) {
    reduction += incentives.design_studio_credits;
  }
  
  if (incentives.rate_buydown) {
    // Approximate value of rate buydown (1 point ≈ 1% of loan amount)
    // Assuming 80% LTV
    reduction += listPrice * 0.8 * (incentives.rate_buydown / 100);
  }

  return listPrice - reduction;
}

function validateEvaluationLogic(evaluation: PriceEvaluation, request: EvaluationRequest): PriceEvaluation {
  const subjectPpsf = evaluation.subject_metrics.price_per_sqft;
  const medianPpsf = evaluation.market_baselines.comp_price_per_sqft.median;
  
  if (subjectPpsf <= 0 || medianPpsf <= 0) {
    console.warn('Invalid price per square foot values detected', { subjectPpsf, medianPpsf });
    return evaluation; // Return as-is if we can't validate
  }
  
  // Calculate the actual percentage difference
  const percentDifference = ((subjectPpsf - medianPpsf) / medianPpsf) * 100;
  
  // Validate the classification matches our 5% threshold logic
  let expectedClassification: PriceEvaluation['classification'];
  if (percentDifference < -5) {
    expectedClassification = 'below_market';
  } else if (percentDifference > 5) {
    expectedClassification = 'above_market';
  } else {
    expectedClassification = 'market_fair';
  }
  
  // If AI classification doesn't match our logic, correct it and reduce confidence
  if (evaluation.classification !== expectedClassification && evaluation.classification !== 'insufficient_data') {
    console.warn('AI classification corrected', {
      original: evaluation.classification,
      corrected: expectedClassification,
      percentDifference: percentDifference.toFixed(1) + '%',
      subjectPpsf,
      medianPpsf
    });
    
    return {
      ...evaluation,
      classification: expectedClassification,
      confidence: Math.max(evaluation.confidence - 20, 30), // Reduce confidence for correction
      assumptions: [...evaluation.assumptions, 'Classification auto-corrected based on price analysis'],
      evidence: [...evaluation.evidence, `Subject is ${percentDifference.toFixed(1)}% ${percentDifference > 0 ? 'above' : 'below'} market median`]
    };
  }
  
  return evaluation;
}