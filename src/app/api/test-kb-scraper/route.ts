import { NextRequest, NextResponse } from 'next/server';
import { scrapeKBHomesLive } from '@/lib/kb-home-scraper';

export async function GET() {
  try {
    console.log('Testing KB Home live scraper...');
    const homes = await scrapeKBHomesLive();
    
    return NextResponse.json({
      success: true,
      message: `Found ${homes.length} homes from KB Home website`,
      homes: homes,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error testing KB Home scraper:', error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}