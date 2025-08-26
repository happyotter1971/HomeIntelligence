import { NextRequest, NextResponse } from 'next/server';
import { getHomes } from '@/lib/firestore';
import { evaluatePrice } from '@/lib/openai/price-evaluator';
import { prepareSubjectProperty, prepareComparableProperty } from '@/lib/price-evaluation/data-prep';
import { findComparableHomes } from '@/lib/price-evaluation/comparables';
import { calculateMarketAggregates } from '@/lib/price-evaluation/aggregates';
import { storeEvaluation } from '@/lib/price-evaluation/storage';
import { EvaluationRequest } from '@/lib/openai/types';

export async function POST(req: NextRequest) {
  try {
    console.log('Starting manual price evaluation...');
    
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
      skipped: 0,
      details: [] as string[]
    };

    // Process first 3 homes only for manual testing to avoid high costs
    const homesToProcess = dreamFinderHomes.slice(0, 3);
    console.log(`Processing first ${homesToProcess.length} homes for testing...`);

    for (const home of homesToProcess) {
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
          const msg = `Skipped ${home.modelName} - insufficient comparables (${comparables.length})`;
          console.log(msg);
          results.skipped++;
          results.details.push(msg);
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
        const msg = `✓ Evaluated ${home.modelName}: ${evaluation.classification} (${evaluation.confidence}% confidence)`;
        console.log(msg);
        results.details.push(msg);

        // Add delay to avoid OpenAI rate limits (1 request per 3 seconds)
        await new Promise(resolve => setTimeout(resolve, 3000));

      } catch (error) {
        const msg = `Error evaluating ${home.modelName}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.error(msg);
        results.errors++;
        results.details.push(msg);
      }
    }

    console.log('Manual price evaluation completed:', results);

    return NextResponse.json({
      success: true,
      message: 'Manual price evaluation completed',
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in manual price evaluation:', error);
    return NextResponse.json(
      { 
        error: 'Failed to run manual price evaluation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}