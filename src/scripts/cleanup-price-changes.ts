import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  deleteDoc, 
  doc,
  query,
  where,
  Timestamp
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCluCL-7-K3Hp0Fo_xyqBK_xr0yj01rVdY",
  authDomain: "homeintelligence-e2202.firebaseapp.com",
  projectId: "homeintelligence-e2202",
  storageBucket: "homeintelligence-e2202.firebasestorage.app",
  messagingSenderId: "844282477498",
  appId: "1:844282477498:web:a2a2965e12c59be24dd2df",
  measurementId: "G-27FFNLECET"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function cleanupBadPriceChanges() {
  console.log('Starting cleanup of bad price change records...');
  
  try {
    // Get all price changes
    const priceChangesRef = collection(db, 'priceChanges');
    const snapshot = await getDocs(priceChangesRef);
    
    console.log(`Found ${snapshot.size} total price change records`);
    
    const badAddresses = [
      '1182 Cunningham Farm Dr',
      '1173 Cunningham Farm Dr', 
      '1161 Cunningham Farm Dr',
      // These are the actual valid addresses from KB Home Move-in Ready homes
      // We'll keep these:
      // '1007 Farm Branch Ct, Indian Trail, NC',
      // '4023 Cunningham Farm Dr, Indian Trail, NC',
      // '2017 Cunningham Farm Dr, Indian Trail, NC',
      // '3001 Cunningham Farm Dr, Indian Trail, NC',
      // '2025 Cunningham Farm Dr, Indian Trail, NC',
      // '1005 Cunningham Farm Dr, Indian Trail, NC'
    ];
    
    let deletedCount = 0;
    let keptCount = 0;
    const deletePromises: Promise<void>[] = [];
    
    for (const docSnapshot of snapshot.docs) {
      const data = docSnapshot.data();
      const address = data.address || '';
      
      // Check if this is a bad address (lot number only, not a real street address)
      // Bad addresses typically have 4-digit numbers followed by street name without "Indian Trail, NC"
      const isBadAddress = 
        // Specific bad addresses we know about
        badAddresses.some(bad => address.includes(bad)) ||
        // Pattern for lot-number-only addresses (4 digits + street without city/state)
        (/^\d{4}\s+(Cunningham Farm Dr|Farm Branch Ct)$/i.test(address)) ||
        // Missing city/state
        (!address.includes('Indian Trail') && address.includes('Cunningham Farm'));
      
      if (isBadAddress) {
        console.log(`Deleting bad price change record: ${address} (${data.modelName})`);
        deletePromises.push(deleteDoc(doc(db, 'priceChanges', docSnapshot.id)));
        deletedCount++;
      } else if (data.builderId && data.builderId.includes('kb-home')) {
        // For KB Home entries, make sure they have valid addresses
        const validKBAddresses = [
          '1007 Farm Branch Ct',
          '4023 Cunningham Farm Dr',
          '2017 Cunningham Farm Dr',
          '3001 Cunningham Farm Dr',
          '2025 Cunningham Farm Dr',
          '1005 Cunningham Farm Dr'
        ];
        
        const hasValidAddress = validKBAddresses.some(valid => address.includes(valid));
        if (!hasValidAddress && address !== '') {
          console.log(`Deleting invalid KB Home price change: ${address} (${data.modelName})`);
          deletePromises.push(deleteDoc(doc(db, 'priceChanges', docSnapshot.id)));
          deletedCount++;
        } else {
          console.log(`Keeping valid price change: ${address} (${data.modelName})`);
          keptCount++;
        }
      } else {
        keptCount++;
      }
    }
    
    // Execute all deletions
    if (deletePromises.length > 0) {
      await Promise.all(deletePromises);
      console.log(`\nSuccessfully deleted ${deletedCount} bad price change records`);
      console.log(`Kept ${keptCount} valid price change records`);
    } else {
      console.log('\nNo bad price change records found to delete');
      console.log(`All ${keptCount} records are valid`);
    }
    
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
  
  process.exit(0);
}

// Run the cleanup
cleanupBadPriceChanges();