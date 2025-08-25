import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, getDocs, deleteDoc, doc, writeBatch } from 'firebase/firestore';

export async function POST() {
  try {
    console.log('Starting complete data cleanup...');
    
    let deletedHomes = 0;
    let deletedPriceChanges = 0;
    
    // Delete all homes
    const homesRef = collection(db, 'homes');
    const homesSnapshot = await getDocs(homesRef);
    
    console.log(`Found ${homesSnapshot.docs.length} homes to delete`);
    
    // Use batched writes for better performance
    const batchSize = 500; // Firestore batch limit
    let batch = writeBatch(db);
    let operationCount = 0;
    
    for (const homeDoc of homesSnapshot.docs) {
      batch.delete(doc(db, 'homes', homeDoc.id));
      operationCount++;
      deletedHomes++;
      
      if (operationCount >= batchSize) {
        await batch.commit();
        batch = writeBatch(db);
        operationCount = 0;
        console.log(`Deleted ${deletedHomes} homes so far...`);
      }
    }
    
    // Commit remaining operations
    if (operationCount > 0) {
      await batch.commit();
    }
    
    console.log(`Deleted all ${deletedHomes} homes`);
    
    // Delete all price changes
    const priceChangesRef = collection(db, 'priceChanges');
    const priceChangesSnapshot = await getDocs(priceChangesRef);
    
    console.log(`Found ${priceChangesSnapshot.docs.length} price changes to delete`);
    
    batch = writeBatch(db);
    operationCount = 0;
    
    for (const priceChangeDoc of priceChangesSnapshot.docs) {
      batch.delete(doc(db, 'priceChanges', priceChangeDoc.id));
      operationCount++;
      deletedPriceChanges++;
      
      if (operationCount >= batchSize) {
        await batch.commit();
        batch = writeBatch(db);
        operationCount = 0;
        console.log(`Deleted ${deletedPriceChanges} price changes so far...`);
      }
    }
    
    // Commit remaining operations
    if (operationCount > 0) {
      await batch.commit();
    }
    
    console.log(`Deleted all ${deletedPriceChanges} price changes`);
    
    return NextResponse.json({
      success: true,
      message: `Successfully deleted all data: ${deletedHomes} homes and ${deletedPriceChanges} price changes`,
      deletedHomes,
      deletedPriceChanges,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error during complete data cleanup:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete all data',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}