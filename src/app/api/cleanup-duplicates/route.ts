import { NextRequest, NextResponse } from 'next/server';
import { getHomes, deleteHome } from '@/lib/firestore';
import { collection, query, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function POST(request: NextRequest) {
  try {
    console.log('Starting duplicate cleanup process...');
    
    // Get all homes
    const homes = await getHomes();
    console.log(`Found ${homes.length} total homes`);
    
    // Group homes by builder and address to identify duplicates
    const homesByAddress = homes.reduce((acc, home) => {
      const key = `${home.builder?.name || 'Unknown'}-${home.address || 'No Address'}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(home);
      return acc;
    }, {} as Record<string, any[]>);
    
    // Find and process duplicates
    let duplicatesFound = 0;
    let homesRemoved = 0;
    
    for (const [addressKey, homesAtAddress] of Object.entries(homesByAddress)) {
      if (homesAtAddress.length > 1) {
        duplicatesFound++;
        console.log(`Found ${homesAtAddress.length} homes at ${addressKey}`);
        
        // Keep the first home (usually the oldest) and remove the rest
        const homesToKeep = homesAtAddress.slice(0, 1);
        const homesToRemove = homesAtAddress.slice(1);
        
        console.log(`Keeping home: ${homesToKeep[0].id} - ${homesToKeep[0].modelName}`);
        
        for (const homeToRemove of homesToRemove) {
          console.log(`Removing duplicate: ${homeToRemove.id} - ${homeToRemove.modelName}`);
          await deleteHome(homeToRemove.id);
          homesRemoved++;
        }
      }
    }
    
    // Also clean up any orphaned price changes for deleted homes
    console.log('Cleaning up orphaned price changes...');
    
    // Get all remaining home IDs after cleanup
    const remainingHomes = await getHomes();
    const validHomeIds = new Set(remainingHomes.map(h => h.id));
    
    // Get all price changes
    const priceChangesQuery = query(collection(db, 'priceChanges'));
    const priceChangesSnapshot = await getDocs(priceChangesQuery);
    
    let orphanedPriceChanges = 0;
    for (const doc of priceChangesSnapshot.docs) {
      const priceChange = doc.data();
      if (priceChange.homeId && !validHomeIds.has(priceChange.homeId)) {
        await deleteDoc(doc.ref);
        orphanedPriceChanges++;
        console.log(`Deleted orphaned price change: ${doc.id}`);
      }
    }
    
    console.log('Duplicate cleanup completed');
    
    return NextResponse.json({
      success: true,
      message: 'Duplicate cleanup completed successfully',
      duplicatesFound,
      homesRemoved,
      orphanedPriceChanges,
      totalHomesAfterCleanup: remainingHomes.length
    });
    
  } catch (error) {
    console.error('Error during duplicate cleanup:', error);
    return NextResponse.json(
      { error: 'Failed to cleanup duplicates', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}