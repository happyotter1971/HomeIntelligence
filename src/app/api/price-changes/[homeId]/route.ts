import { NextRequest, NextResponse } from 'next/server';
import { getPriceChangesForHome, getPriceChangesByModelAttributes, getAllPriceChangesForModel, getHomeById } from '@/lib/firestore';

export async function GET(
  request: NextRequest,
  { params }: { params: { homeId: string } }
) {
  try {
    const homeId = params.homeId;
    console.log('API: Fetching price changes for home:', homeId);
    
    // Get the home data first
    const home = await getHomeById(homeId);
    if (!home) {
      return NextResponse.json({ error: 'Home not found' }, { status: 404 });
    }
    
    console.log('API: Home data:', {
      id: home.id,
      modelName: home.modelName,
      price: home.price,
      builderId: home.builderId,
      communityId: home.communityId,
      address: home.address,
      homesiteNumber: home.homesiteNumber
    });
    
    // Try multiple approaches to find price changes
    let priceChanges: any[] = [];
    
    // First try by homeId
    priceChanges = await getPriceChangesForHome(homeId);
    console.log('API: Price changes by homeId:', priceChanges.length);
    
    // If no results, try by model attributes
    if (priceChanges.length === 0) {
      console.log('API: Trying by model attributes...');
      priceChanges = await getPriceChangesByModelAttributes(
        home.modelName,
        home.builderId,
        home.communityId
      );
      console.log('API: Price changes by model attributes:', priceChanges.length);
    }
    
    // If still no results, try by model name only
    if (priceChanges.length === 0) {
      console.log('API: Trying by model name only...');
      const allModelChanges = await getAllPriceChangesForModel(home.modelName);
      console.log('API: All model changes found:', allModelChanges.length);
      
      // Filter by community and optionally by address/homesite
      priceChanges = allModelChanges.filter(pc => {
        if (pc.communityId !== home.communityId) return false;
        
        // Try to match by address or homesite if available
        if (home.address && pc.address) {
          return pc.address === home.address;
        }
        if (home.homesiteNumber && pc.homesiteNumber) {
          return pc.homesiteNumber === home.homesiteNumber;
        }
        
        return true; // Include if same community
      });
      console.log('API: Filtered price changes:', priceChanges.length);
    }
    
    // Deduplicate price changes by unique old price -> new price combinations
    const seenChanges = new Set<string>();
    const uniquePriceChanges = priceChanges.filter(pc => {
      const changeKey = `${pc.oldPrice}->${pc.newPrice}`;
      if (seenChanges.has(changeKey)) {
        console.log('API: Filtering duplicate price change:', changeKey);
        return false;
      }
      seenChanges.add(changeKey);
      return true;
    });
    
    console.log(`API: Deduplicated from ${priceChanges.length} to ${uniquePriceChanges.length} price changes`);

    const result = {
      homeId,
      home: {
        id: home.id,
        modelName: home.modelName,
        price: home.price,
        address: home.address,
        homesiteNumber: home.homesiteNumber
      },
      priceChanges: uniquePriceChanges.map(pc => ({
        id: pc.id,
        homeId: pc.homeId,
        oldPrice: pc.oldPrice,
        newPrice: pc.newPrice,
        changeAmount: pc.changeAmount,
        changePercentage: pc.changePercentage,
        changeDate: pc.changeDate,
        oldPriceDate: pc.oldPriceDate,
        changeType: pc.changeType,
        daysSinceLastChange: pc.daysSinceLastChange,
        address: pc.address,
        homesiteNumber: pc.homesiteNumber
      })),
      count: uniquePriceChanges.length
    };
    
    console.log('API: Returning result with', uniquePriceChanges.length, 'price changes');
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('API Error fetching price changes:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch price changes',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}