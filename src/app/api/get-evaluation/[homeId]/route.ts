import { NextRequest, NextResponse } from 'next/server';
import { getStoredEvaluation } from '@/lib/price-evaluation/storage';

export async function GET(
  request: NextRequest,
  { params }: { params: { homeId: string } }
) {
  try {
    const homeId = params.homeId;
    
    if (!homeId) {
      return NextResponse.json(
        { error: 'Home ID is required' },
        { status: 400 }
      );
    }

    console.log(`Fetching evaluation for home: ${homeId}`);
    
    // Get stored evaluation from database
    const storedEvaluation = await getStoredEvaluation(homeId);
    
    if (storedEvaluation) {
      console.log(`Found evaluation for home ${homeId}`);
      return NextResponse.json({
        success: true,
        evaluation: storedEvaluation.evaluation,
        evaluatedAt: storedEvaluation.evaluatedAt.toDate().toISOString(),
        homeData: storedEvaluation.homeData
      });
    } else {
      console.log(`No evaluation found for home ${homeId}`);
      return NextResponse.json({
        success: false,
        message: 'No evaluation found for this home'
      });
    }
    
  } catch (error) {
    console.error('Error fetching evaluation:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch evaluation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}