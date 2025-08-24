import { NextRequest, NextResponse } from 'next/server';
import { refreshHomesWithPriceTracking } from '@/lib/scrape-and-update';

export async function POST(request: NextRequest) {
  try {
    console.log('Starting KB Home duplicate cleanup by re-scraping...');
    
    // The best way to fix duplicates is to trigger a fresh scrape
    // This will use our improved scraper with unique address generation
    const result = await refreshHomesWithPriceTracking();
    
    console.log('KB Home duplicate cleanup completed via re-scraping');
    
    return NextResponse.json({
      success: true,
      message: 'KB Home duplicates cleaned up via fresh scraping',
      ...result
    });
    
  } catch (error) {
    console.error('Error during KB Home duplicate cleanup:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup KB Home duplicates', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}