import { NextResponse } from 'next/server';
import { fixKBHomePriceChanges } from '@/lib/fix-kb-price-changes';

export async function POST() {
  try {
    console.log('API: Starting KB Home price changes fix...');
    
    const result = await fixKBHomePriceChanges();
    
    return NextResponse.json({
      success: true,
      message: 'KB Home price changes fixed successfully',
      ...result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('API error fixing KB Home price changes:', error);
    return NextResponse.json(
      { error: 'Failed to fix KB Home price changes', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}