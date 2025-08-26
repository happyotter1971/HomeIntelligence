import { NextRequest, NextResponse } from 'next/server';
import { refreshHomesWithPriceTracking } from '@/lib/scrape-and-update';

// Force dynamic rendering for cron jobs
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Verify this is a cron request (Vercel automatically adds this header)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.log('Unauthorized cron request');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Daily automated scrape started at:', new Date().toISOString());
    
    const result = await refreshHomesWithPriceTracking();
    
    console.log('Daily automated scrape completed:', result);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Daily scraping completed successfully',
      ...result,
      timestamp: new Date().toISOString(),
      type: 'automated'
    });
    
  } catch (error: any) {
    console.error('Daily scrape cron error:', error);
    
    // Still return 200 to avoid Vercel retrying
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Daily scraping failed',
      timestamp: new Date().toISOString(),
      type: 'automated'
    });
  }
}

// Also support POST for manual testing
export async function POST(request: NextRequest) {
  return GET(request);
}