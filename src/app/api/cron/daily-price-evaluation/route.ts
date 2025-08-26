import { NextRequest, NextResponse } from 'next/server';
import { getHomes } from '@/lib/firestore';
import { evaluatePrice } from '@/lib/openai/price-evaluator';
import { prepareSubjectProperty, prepareComparableProperty } from '@/lib/price-evaluation/data-prep';
import { findComparableHomes } from '@/lib/price-evaluation/comparables';
import { calculateMarketAggregates } from '@/lib/price-evaluation/aggregates';
import { storeEvaluation } from '@/lib/price-evaluation/storage';
import { EvaluationRequest } from '@/lib/openai/types';

// Force dynamic rendering for cron jobs
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Verify cron secret for security
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get('authorization');
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Starting daily price evaluation cron job...');
    
    // Get all homes
    const allHomes = await getHomes();
    
    // Filter for DreamFinder homes only
    const dreamFinderHomes = allHomes.filter(home => 
      home.builder?.name.includes('Dream Finders') && 
      home.status === 'quick-move-in'
    );

    console.log(`Found ${dreamFinderHomes.length} DreamFinder quick-move-in homes to evaluate`);

    const results = {
      total: dreamFinderHomes.length,
      evaluated: 0,
      errors: 0,
      skipped: 0
    };

    // Process homes one by one to avoid rate limiting
    for (const home of dreamFinderHomes) {
      try {
        console.log(`Evaluating ${home.modelName} (${home.id})...`);

        // Find comparable homes
        const comparables = await findComparableHomes({
          city: home.community?.city || 'Indian Trail',
          zipCode: home.community?.zipCode || '28079',
          bedrooms: home.bedrooms,
          squareFeet: home.squareFootage,
          excludeId: home.id
        });

        if (comparables.length < 2) {
          console.log(`Skipping ${home.modelName} - insufficient comparables (${comparables.length})`);
          results.skipped++;
          continue;
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

        // Call ChatGPT for evaluation
        const evaluation = await evaluatePrice(evaluationRequest);

        // Store the evaluation
        await storeEvaluation(home.id, evaluation, {
          modelName: home.modelName,
          price: home.price,
          address: home.address || 'Address not available',
          builderName: home.builder?.name || 'Dream Finders',
          communityName: home.community?.name || 'Unknown Community'
        });

        results.evaluated++;
        console.log(`✓ Evaluated ${home.modelName}: ${evaluation.classification} (${evaluation.confidence}% confidence)`);

        // Add delay to avoid OpenAI rate limits (1 request per 3 seconds)
        await new Promise(resolve => setTimeout(resolve, 3000));

      } catch (error) {
        console.error(`Error evaluating ${home.modelName}:`, error);
        results.errors++;
      }
    }

    console.log('Daily price evaluation completed:', results);

    return NextResponse.json({
      success: true,
      message: 'Daily price evaluation completed',
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in daily price evaluation cron:', error);
    return NextResponse.json(
      { 
        error: 'Failed to run daily price evaluation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}