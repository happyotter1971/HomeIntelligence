import { NextRequest, NextResponse } from 'next/server';
import { collection, query, where, getDocs, doc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Timestamp } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const { modelName } = await request.json();
    
    if (!modelName) {
      return NextResponse.json({ error: 'Missing modelName' }, { status: 400 });
    }
    
    // Get all homes with this model name
    const homesQuery = query(
      collection(db, 'homes'),
      where('modelName', '==', modelName)
    );
    const homesSnapshot = await getDocs(homesQuery);
    
    // Get all price changes for this model
    const priceChangesQuery = query(
      collection(db, 'priceChanges'),
      where('modelName', '==', modelName)
    );
    const priceChangesSnapshot = await getDocs(priceChangesQuery);
    
    const results = {
      modelName,
      homesFound: homesSnapshot.size,
      priceChangesFound: priceChangesSnapshot.size,
      created: [] as Array<{
        homeId: string;
        priceChangeId: string;
        address: any;
      }>
    };
    
    // For each home that doesn't have price changes, create synthetic ones
    for (const homeDoc of homesSnapshot.docs) {
      const homeData = homeDoc.data();
      const homeId = homeDoc.id;
      
      // Check if this home has any price changes
      const homePriceChanges = priceChangesSnapshot.docs.filter(
        pc => pc.data().homeId === homeId
      );
      
      if (homePriceChanges.length === 0) {
        console.log(`Home ${homeId} has no price changes, creating synthetic one`);
        
        // Create a synthetic price change from 439990 to current price
        const priceChangeData: any = {
          homeId: homeId,
          builderId: homeData.builderId,
          communityId: homeData.communityId,
          modelName: homeData.modelName,
          oldPrice: 439990, // Original price
          newPrice: homeData.price,
          changeAmount: homeData.price - 439990,
          changePercentage: ((homeData.price - 439990) / 439990) * 100,
          changeDate: Timestamp.now(),
          oldPriceDate: Timestamp.fromDate(new Date('2025-08-01')), // Approximate original date
          changeType: homeData.price < 439990 ? 'decrease' : 'increase',
          daysSinceLastChange: 23
        };
        
        // Only add optional fields if they exist
        if (homeData.address) {
          priceChangeData.address = homeData.address;
        }
        if (homeData.homesiteNumber) {
          priceChangeData.homesiteNumber = homeData.homesiteNumber;
        }
        
        const docRef = await addDoc(collection(db, 'priceChanges'), priceChangeData);
        results.created.push({
          homeId,
          priceChangeId: docRef.id,
          address: homeData.address
        });
      }
    }
    
    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error('Link price changes error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}