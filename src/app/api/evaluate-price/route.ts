import { NextRequest, NextResponse } from 'next/server';
import { getHome, getHomes } from '@/lib/firestore';
import { evaluatePrice } from '@/lib/openai/price-evaluator';
import { prepareSubjectProperty, prepareComparableProperty } from '@/lib/price-evaluation/data-prep';
import { findComparableHomes } from '@/lib/price-evaluation/comparables';
import { calculateMarketAggregates } from '@/lib/price-evaluation/aggregates';
import { storeEvaluation, getStoredEvaluation } from '@/lib/price-evaluation/storage';
import { EvaluationRequest } from '@/lib/openai/types';

// Enhanced pricing system imports
import { enhancedPriceEvaluation, generateNarrativePrompt, validateEnhancedInputs } from '@/lib/price-evaluation/enhanced';
import type { RecordRaw } from '@/lib/price-evaluation/enhanced/types';

// Utility function to recursively remove undefined values from objects for Firestore
function cleanObjectForFirestore(obj: any): any {
  if (obj === null || obj === undefined) {
    return null;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => cleanObjectForFirestore(item)).filter(item => item !== null && item !== undefined);
  }
  
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const cleanedValue = cleanObjectForFirestore(value);
      if (cleanedValue !== null && cleanedValue !== undefined) {
        cleaned[key] = cleanedValue;
      }
    }
    return cleaned;
  }
  
  return obj;
}

export async function POST(req: NextRequest) {
  try {
    const { homeId, forceUpdate = false, useEnhanced = false } = await req.json();
    
    if (!homeId) {
      return NextResponse.json(
        { error: 'Home ID is required' },
        { status: 400 }
      );
    }
    
    // Check if we already have a recent evaluation (unless forced)
    if (!forceUpdate) {
      const storedEval = await getStoredEvaluation(homeId);
      if (storedEval) {
        // Check if evaluation is from today or yesterday (still fresh)
        const evalDate = storedEval.evaluatedAt.toDate();
        const now = new Date();
        const hoursSinceEval = (now.getTime() - evalDate.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceEval < 24) {
          console.log(`Using cached evaluation for ${homeId} (${Math.round(hoursSinceEval)}h old)`);
          return NextResponse.json({
            evaluation: storedEval.evaluation,
            homeId,
            cached: true,
            evaluatedAt: storedEval.evaluatedAt.toDate().toISOString(),
            timestamp: new Date().toISOString()
          });
        }
      }
    }
    
    // Fetch the subject home for fresh evaluation
    const home = await getHome(homeId);
    
    if (!home) {
      return NextResponse.json(
        { error: 'Home not found' },
        { status: 404 }
      );
    }
    
    // Branch: Enhanced pricing system vs. Legacy system
    let evaluation: any;
    
    if (useEnhanced) {
      console.log('🚀 Using enhanced deterministic pricing system');
      
      // Get all homes for enhanced system
      const allHomes = await getHomes();
      
      // Convert subject to enhanced format
      const subjectRaw: RecordRaw = {
        id: home.id,
        price: home.price,
        sqft: home.squareFootage,
        beds: home.bedrooms,
        baths_full: Math.floor(home.bathrooms),
        baths_half: (home.bathrooms % 1) >= 0.5 ? 1 : 0,
        garage: home.garageSpaces || 0,
        lot_sqft: home.lotSize,
        year_built: new Date().getFullYear(), // Assuming new construction
        status: home.status,
        address: home.address,
        subdivision: home.community?.name,
        school_zone: 'Union County Public Schools', // Default for Indian Trail
        mls_id: home.id,
        plan_name: home.modelName,
        lat: home.community?.coordinates?.lat,
        lng: home.community?.coordinates?.lng,
        list_date: home.createdAt?.toDate(),
        property_type: 'single-family',
        builder: home.builder?.name,
        community: home.community?.name
      };
      
      // Convert market data to enhanced format
      const marketRaw: RecordRaw[] = allHomes.map(h => ({
        id: h.id,
        price: h.price,
        sqft: h.squareFootage,
        beds: h.bedrooms,
        baths_full: Math.floor(h.bathrooms),
        baths_half: (h.bathrooms % 1) >= 0.5 ? 1 : 0,
        garage: h.garageSpaces || 0,
        lot_sqft: h.lotSize,
        year_built: new Date().getFullYear(),
        status: h.status,
        address: h.address,
        subdivision: h.community?.name,
        school_zone: 'Union County Public Schools',
        mls_id: h.id,
        plan_name: h.modelName,
        lat: h.community?.coordinates?.lat,
        lng: h.community?.coordinates?.lng,
        list_date: h.createdAt?.toDate(),
        sold_date: h.status === 'sold' ? h.lastUpdated?.toDate() : undefined,
        property_type: 'single-family',
        builder: h.builder?.name,
        community: h.community?.name
      }));
      
      // Validate inputs
      const validation = validateEnhancedInputs(subjectRaw, marketRaw);
      if (!validation.isValid) {
        return NextResponse.json({
          error: 'Enhanced pricing validation failed',
          details: validation.warnings,
          recommendations: validation.recommendations
        }, { status: 400 });
      }
      
      // Run enhanced evaluation
      const enhancedResult = await enhancedPriceEvaluation(subjectRaw, marketRaw);
      
      if (enhancedResult.status !== 'success') {
        return NextResponse.json({
          classification: 'insufficient_data',
          message: 'Enhanced pricing analysis failed',
          confidence: 0,
          enhanced: true,
          details: enhancedResult
        });
      }
      
      // Convert enhanced result to legacy format for compatibility
      const classificationMap: {[key: string]: string} = {
        'Below': 'below_market',
        'Market Fair': 'market_fair',
        'Above': 'above_market',
        'Insufficient Data': 'insufficient_data'
      };
      
      evaluation = {
        classification: classificationMap[enhancedResult.classification] || 'insufficient_data',
        subject_metrics: {
          list_price: subjectRaw.price,
          effective_price: subjectRaw.price,
          heated_sqft: subjectRaw.sqft,
          price_per_sqft: Math.round(subjectRaw.price / subjectRaw.sqft)
        },
        market_baselines: {
          filtered_comp_count: enhancedResult.model_stats?.comp_count || 0,
          comp_price_per_sqft: {
            p25: Math.round(enhancedResult.median_ppsf * 0.95),
            median: Math.round(enhancedResult.median_ppsf),
            p75: Math.round(enhancedResult.median_ppsf * 1.05)
          },
          comp_list_price: {
            p25: Math.round(enhancedResult.median_ppsf * subjectRaw.sqft * 0.95),
            median: Math.round(enhancedResult.median_ppsf * subjectRaw.sqft),
            p75: Math.round(enhancedResult.median_ppsf * subjectRaw.sqft * 1.05)
          }
        },
        price_gap: {
          vs_median_ppsf: Math.round(enhancedResult.price_gap.delta_ppsf),
          vs_median_list: Math.round(enhancedResult.price_gap.total_delta)
        },
        suggested_price_range: enhancedResult.suggested_price_range,
        key_comparables: enhancedResult.explain.top3.map((comp, idx) => ({
          address: `Comparable ${idx + 1}`,
          status: 'comparable',
          ppsf: Math.round(comp.adjusted_ppsf),
          distance_miles: Math.round(comp.distance_miles * 10) / 10,
          notes: `Adjusted from $${Math.round(comp.raw_ppsf)}/sqft`
        })),
        assumptions: [
          'Enhanced deterministic pricing analysis',
          `Based on ${enhancedResult.model_stats?.comp_count || 0} comparable properties`,
          `Confidence: ${enhancedResult.confidence}%`
        ],
        confidence: enhancedResult.confidence,
        evidence: [
          `Subject: $${enhancedResult.explain.band.subject_ppsf.toFixed(0)}/sqft vs market median $${enhancedResult.median_ppsf.toFixed(0)}/sqft`,
          `Price difference: $${Math.abs(enhancedResult.price_gap.total_delta).toLocaleString()} ${enhancedResult.price_gap.total_delta >= 0 ? 'above' : 'below'} market`
        ],
        // Enhanced-specific fields
        enhanced: true,
        enhanced_result: {
          ...enhancedResult,
          model_stats: enhancedResult.model_stats ? {
            comp_count: enhancedResult.model_stats.comp_count,
            adjusted_comps: enhancedResult.model_stats.adjusted_comps,
            penalties: enhancedResult.model_stats.penalties
            // Exclude hedonic_model which contains non-serializable functions
          } : undefined
        }
      };
      
    } else {
      console.log('📊 Using legacy LLM-based pricing system');
      
      // Find comparable homes
      const comparables = await findComparableHomes({
        city: home.community?.city || 'Indian Trail',
        zipCode: home.community?.zipCode || '28079',
        bedrooms: home.bedrooms,
        squareFeet: home.squareFootage,
        excludeId: home.id
      });
      
      if (comparables.length < 1) {
        return NextResponse.json({
          classification: 'insufficient_data',
          message: 'Not enough comparable homes found for evaluation',
          confidence: 0
        });
      }
      
      // Prepare data for evaluation
      const subject = prepareSubjectProperty(home);
      const comps = comparables.map(comp => prepareComparableProperty(comp, home));
      const aggregates = calculateMarketAggregates(comparables);
      
      const evaluationRequest: EvaluationRequest = {
        subject,
        comps,
        aggregates
      };
      
      // Call OpenAI for evaluation
      evaluation = await evaluatePrice(evaluationRequest);
    }
    
    // Clean evaluation data to remove undefined values before storage
    const cleanEvaluation = cleanObjectForFirestore(evaluation);
    
    // Store the evaluation for future use
    await storeEvaluation(home.id, cleanEvaluation, {
      modelName: home.modelName || 'Unknown Model',
      price: home.price,
      address: home.address || 'Address not available',
      builderName: home.builder?.name || 'Unknown Builder',
      communityName: home.community?.name || 'Unknown Community'
    });
    
    return NextResponse.json({
      evaluation,
      homeId,
      timestamp: new Date().toISOString(),
      systemUsed: useEnhanced ? 'enhanced' : 'legacy',
      enhanced: useEnhanced
    });
    
  } catch (error) {
    console.error('Error in price evaluation:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to evaluate price',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const homeId = searchParams.get('homeId');
  
  if (!homeId) {
    return NextResponse.json(
      { error: 'Home ID is required' },
      { status: 400 }
    );
  }
  
  // For GET requests, just check if we can find the home
  const home = await getHome(homeId);
  
  if (!home) {
    return NextResponse.json(
      { error: 'Home not found' },
      { status: 404 }
    );
  }
  
  return NextResponse.json({
    message: 'Use POST request to evaluate price',
    home: {
      id: home.id,
      address: home.address,
      price: home.price
    }
  });
}