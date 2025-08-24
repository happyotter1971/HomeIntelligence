import { NextRequest, NextResponse } from 'next/server';
import { refreshHomesFromWebsites } from '@/lib/scrape-and-update';

export async function POST(request: NextRequest) {
  try {
    // Optional: Add authentication check here
    // const authHeader = request.headers.get('authorization');
    // if (!authHeader || authHeader !== `Bearer ${process.env.SCRAPE_API_KEY}`) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    console.log('Manual scrape triggered at:', new Date().toISOString());
    
    const result = await refreshHomesFromWebsites();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Scraping completed successfully',
      ...result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('Scrape API error:', error);
    
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Scraping failed',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Scrape endpoint is active. Use POST to trigger scraping.',
    timestamp: new Date().toISOString()
  });
}