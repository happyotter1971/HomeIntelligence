import { NextRequest, NextResponse } from 'next/server';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const modelName = searchParams.get('model') || '2486';
    
    console.log(`Debugging price changes for model: ${modelName}`);
    
    // Get all price changes for this model
    const priceChangesQuery = query(
      collection(db, 'priceChanges'),
      where('modelName', '==', modelName),
      limit(10)
    );
    
    const priceChangesSnapshot = await getDocs(priceChangesQuery);
    const priceChanges: any[] = [];
    
    priceChangesSnapshot.forEach((doc) => {
      priceChanges.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Get all homes with this model name
    const homesQuery = query(
      collection(db, 'homes'),
      where('modelName', '==', modelName),
      limit(10)
    );
    
    const homesSnapshot = await getDocs(homesQuery);
    const homes: any[] = [];
    
    homesSnapshot.forEach((doc) => {
      homes.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Match up price changes with homes
    const analysis = {
      modelName,
      priceChangesCount: priceChanges.length,
      homesCount: homes.length,
      priceChanges: priceChanges.map(pc => ({
        id: pc.id,
        homeId: pc.homeId,
        modelName: pc.modelName,
        oldPrice: pc.oldPrice,
        newPrice: pc.newPrice,
        changeDate: pc.changeDate?.toDate?.() || pc.changeDate,
        builderId: pc.builderId,
        communityId: pc.communityId,
        address: pc.address
      })),
      homes: homes.map(h => ({
        id: h.id,
        modelName: h.modelName,
        price: h.price,
        builderId: h.builderId,
        communityId: h.communityId,
        address: h.address,
        lastUpdated: h.lastUpdated?.toDate?.() || h.lastUpdated
      })),
      matches: []
    };
    
    // Find matches between price changes and homes
    for (const pc of priceChanges) {
      const matchingHome = homes.find(h => h.id === pc.homeId);
      if (matchingHome) {
        analysis.matches.push({
          priceChangeId: pc.id,
          homeId: matchingHome.id,
          priceChangeNewPrice: pc.newPrice,
          homeCurrentPrice: matchingHome.price,
          priceMatch: pc.newPrice === matchingHome.price,
          issue: pc.newPrice !== matchingHome.price ? 'PRICE_MISMATCH' : 'OK'
        });
      } else if (pc.homeId) {
        analysis.matches.push({
          priceChangeId: pc.id,
          homeId: pc.homeId,
          issue: 'HOME_NOT_FOUND'
        });
      }
    }
    
    return NextResponse.json(analysis, { status: 200 });
  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}