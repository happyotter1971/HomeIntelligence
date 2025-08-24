import { NextRequest, NextResponse } from 'next/server';
import { collection, query, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    // Get all price changes
    const priceChangesQuery = query(collection(db, 'priceChanges'));
    const priceChangesSnapshot = await getDocs(priceChangesQuery);
    
    const results = {
      total: priceChangesSnapshot.size,
      lotBased: 0,
      deleted: 0,
      kept: 0,
      deletedIds: [] as string[]
    };
    
    // Find and delete price changes with lot-based addresses
    for (const docSnap of priceChangesSnapshot.docs) {
      const priceChange = docSnap.data();
      const isLotBased = priceChange.address && priceChange.address.includes('Lot ');
      
      if (isLotBased) {
        results.lotBased++;
        console.log(`Deleting lot-based price change: ${docSnap.id} - ${priceChange.address}`);
        
        await deleteDoc(doc(db, 'priceChanges', docSnap.id));
        results.deleted++;
        results.deletedIds.push(docSnap.id);
      } else {
        results.kept++;
        console.log(`Keeping price change: ${docSnap.id} - ${priceChange.address || 'no address'}`);
      }
    }
    
    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error('Cleanup price changes error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}