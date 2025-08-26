import { NextRequest, NextResponse } from 'next/server';
import { getHome, getHomes } from '@/lib/firestore';
import { evaluatePrice } from '@/lib/openai/price-evaluator';
import { prepareSubjectProperty, prepareComparableProperty } from '@/lib/price-evaluation/data-prep';
import { findComparableHomes } from '@/lib/price-evaluation/comparables';
import { calculateMarketAggregates } from '@/lib/price-evaluation/aggregates';
import { storeEvaluation, getStoredEvaluation } from '@/lib/price-evaluation/storage';
import { EvaluationRequest } from '@/lib/openai/types';

export async function POST(req: NextRequest) {
  try {
    const { homeId, forceUpdate = false } = await req.json();
    
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
    
    // Find comparable homes
    const comparables = await findComparableHomes({
      city: home.community?.city || 'Indian Trail',
      zipCode: home.community?.zipCode || '28079',
      bedrooms: home.bedrooms,
      squareFeet: home.squareFootage,
      excludeId: home.id
    });
    
    if (comparables.length < 2) {
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
    const evaluation = await evaluatePrice(evaluationRequest);
    
    // Store the evaluation for future use
    await storeEvaluation(home.id, evaluation, {
      modelName: home.modelName,
      price: home.price,
      address: home.address || 'Address not available',
      builderName: home.builder?.name || 'Unknown Builder',
      communityName: home.community?.name || 'Unknown Community'
    });
    
    return NextResponse.json({
      evaluation,
      homeId,
      timestamp: new Date().toISOString()
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