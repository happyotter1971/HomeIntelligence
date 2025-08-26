import { NextRequest, NextResponse } from 'next/server';
import { getHome, getHomes } from '@/lib/firestore';
import { enhancedPriceEvaluation, generateNarrativePrompt, validateEnhancedInputs } from '@/lib/price-evaluation/enhanced';
import type { RecordRaw } from '@/lib/price-evaluation/enhanced/types';

export async function POST(req: NextRequest) {
  try {
    const { homeId, options = {} } = await req.json();
    
    if (!homeId) {
      return NextResponse.json(
        { error: 'Home ID is required' },
        { status: 400 }
      );
    }
    
    console.log('🚀 Enhanced pricing evaluation for:', homeId);
    
    // Fetch the subject home
    const home = await getHome(homeId);
    
    if (!home) {
      return NextResponse.json(
        { error: 'Home not found' },
        { status: 404 }
      );
    }
    
    // Get all homes for market data
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
        warnings: validation.warnings,
        recommendations: validation.recommendations,
        estimated_comps: validation.estimatedComps
      }, { status: 400 });
    }
    
    // Run enhanced evaluation
    const result = await enhancedPriceEvaluation(subjectRaw, marketRaw, options);
    
    console.log('Enhanced evaluation result:', result.status, result.classification, result.confidence + '%');
    
    if (result.status !== 'success') {
      console.error('Enhanced pricing failed:', result);
      return NextResponse.json({
        error: 'Enhanced pricing analysis failed',
        result,
        validation,
        debug: {
          status: result.status,
          classification: result.classification,
          confidence: result.confidence
        }
      }, { status: 422 });
    }
    
    // Generate narrative prompt for LLM
    const narrativePrompt = generateNarrativePrompt(result);
    
    return NextResponse.json({
      success: true,
      homeId,
      result,
      narrativePrompt, // For optional LLM narrative generation
      validation,
      systemInfo: {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        method: 'enhanced_deterministic',
        comparables_found: result.model_stats?.comp_count || 0,
        hedonic_model_used: !!result.model_stats?.hedonic_model
      }
    });
    
  } catch (error) {
    console.error('Error in enhanced price evaluation:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to evaluate price using enhanced system',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const homeId = searchParams.get('homeId');
  
  if (!homeId) {
    return NextResponse.json({
      message: 'Enhanced pricing evaluation system',
      usage: 'POST with { homeId, options? }',
      options: {
        minComps: 'Minimum comparable homes required (default: 3)',
        useHedonicModel: 'Enable hedonic pricing model (default: true)',
        fallbackToHeuristics: 'Use heuristics if hedonic fails (default: true)',
        maxAdjustmentPct: 'Maximum allowed adjustment percentage (default: 25)'
      },
      features: [
        'Deterministic mathematical calculations',
        'Robust statistical methods',
        'Hedonic pricing model with ridge regression',
        'Iterative comparable selection',
        'Quality control and confidence scoring',
        'Prediction intervals'
      ],
      version: '1.0.0'
    });
  }
  
  // Check if home exists for preview
  const home = await getHome(homeId);
  
  if (!home) {
    return NextResponse.json(
      { error: 'Home not found' },
      { status: 404 }
    );
  }
  
  // Get market data for validation preview
  const allHomes = await getHomes();
  const subjectRaw = {
    id: home.id,
    price: home.price,
    sqft: home.squareFootage,
    beds: home.bedrooms
  };
  
  const marketRaw = allHomes.map(h => ({
    id: h.id,
    price: h.price,
    sqft: h.squareFootage,
    beds: h.bedrooms
  }));
  
  const validation = validateEnhancedInputs(subjectRaw, marketRaw);
  
  return NextResponse.json({
    message: 'Enhanced pricing system ready',
    home: {
      id: home.id,
      address: home.address,
      price: home.price,
      sqft: home.squareFootage,
      beds: home.bedrooms,
      baths: home.bathrooms
    },
    validation,
    instructions: 'Use POST request to run evaluation'
  });
}