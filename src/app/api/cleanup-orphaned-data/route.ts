import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, deleteDoc, doc, where } from 'firebase/firestore';
import { getHomes } from '@/lib/firestore';

export async function POST() {
  try {
    console.log('Starting cleanup of orphaned data...');
    
    // Get all valid home IDs
    const allHomes = await getHomes();
    const validHomeIds = new Set(allHomes.map(home => home.id));
    
    console.log(`Found ${validHomeIds.size} valid homes in database`);
    
    // Check for orphaned price changes
    const priceChangesRef = collection(db, 'priceChanges');
    const priceChangesSnapshot = await getDocs(priceChangesRef);
    
    let orphanedPriceChanges = 0;
    const priceChangesToDelete: string[] = [];
    
    for (const docSnapshot of priceChangesSnapshot.docs) {
      const priceChange = docSnapshot.data();
      const homeId = priceChange.homeId;
      
      if (!validHomeIds.has(homeId)) {
        console.log(`Found orphaned price change for deleted home ${homeId}: ${priceChange.modelName || 'Unknown'} at ${priceChange.address || 'Unknown'}`);
        priceChangesToDelete.push(docSnapshot.id);
        orphanedPriceChanges++;
      }
    }
    
    // Delete orphaned price changes
    for (const priceChangeId of priceChangesToDelete) {
      await deleteDoc(doc(db, 'priceChanges', priceChangeId));
    }
    
    console.log(`Cleaned up ${orphanedPriceChanges} orphaned price changes`);
    
    return NextResponse.json({
      success: true,
      message: `Cleaned up ${orphanedPriceChanges} orphaned price changes`,
      orphanedPriceChanges,
      validHomes: validHomeIds.size,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error cleaning up orphaned data:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to clean up orphaned data',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}