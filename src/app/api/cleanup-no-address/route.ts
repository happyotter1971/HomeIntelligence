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
      noAddress: 0,
      deleted: 0,
      kept: 0,
      deletedIds: [] as string[]
    };
    
    // Find and delete price changes without proper addresses
    for (const docSnap of priceChangesSnapshot.docs) {
      const priceChange = docSnap.data();
      const hasNoAddress = !priceChange.address || 
                          priceChange.address.trim() === '' || 
                          priceChange.address.includes('Address Not Available');
      
      if (hasNoAddress) {
        results.noAddress++;
        console.log(`Deleting price change with no address: ${docSnap.id} - ${priceChange.modelName} - ${priceChange.address || 'no address'}`);
        
        await deleteDoc(doc(db, 'priceChanges', docSnap.id));
        results.deleted++;
        results.deletedIds.push(docSnap.id);
      } else {
        results.kept++;
        console.log(`Keeping price change: ${docSnap.id} - ${priceChange.address}`);
      }
    }
    
    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error('Cleanup no address error:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}