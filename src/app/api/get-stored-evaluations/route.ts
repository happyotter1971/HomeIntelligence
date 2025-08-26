import { NextRequest, NextResponse } from 'next/server';
import { getEvaluationsForBuilder } from '@/lib/price-evaluation/storage';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const builderName = searchParams.get('builder') || 'Dream Finders';
    
    console.log(`Fetching stored evaluations for ${builderName}...`);
    
    // Get stored evaluations from database
    const storedEvals = await getEvaluationsForBuilder(builderName);
    
    // Convert to simple format for frontend
    const evaluations: {[homeId: string]: any} = {};
    Object.values(storedEvals).forEach(stored => {
      evaluations[stored.homeId] = {
        ...stored.evaluation,
        evaluatedAt: stored.evaluatedAt.toDate().toISOString()
      };
    });
    
    console.log(`Found ${Object.keys(evaluations).length} stored evaluations for ${builderName}`);
    
    return NextResponse.json({
      success: true,
      builder: builderName,
      count: Object.keys(evaluations).length,
      evaluations,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error fetching stored evaluations:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch stored evaluations',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}