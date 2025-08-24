import { collection, query, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from './firebase';

export const clearAllHomes = async () => {
  try {
    console.log('Clearing all homes from database...');
    
    // Get all homes
    const homesQuery = query(collection(db, 'homes'));
    const querySnapshot = await getDocs(homesQuery);
    
    console.log(`Found ${querySnapshot.docs.length} homes to delete`);
    
    // Delete all homes
    for (const doc of querySnapshot.docs) {
      await deleteDoc(doc.ref);
    }
    
    console.log('Successfully cleared all homes from database');
    return { deletedCount: querySnapshot.docs.length };
  } catch (error) {
    console.error('Error clearing homes:', error);
    throw error;
  }
};

export const clearAllData = async () => {
  try {
    console.log('Clearing all data from database...');
    
    // Clear homes
    const homesQuery = query(collection(db, 'homes'));
    const homesSnapshot = await getDocs(homesQuery);
    for (const doc of homesSnapshot.docs) {
      await deleteDoc(doc.ref);
    }
    
    // Clear communities
    const communitiesQuery = query(collection(db, 'communities'));
    const communitiesSnapshot = await getDocs(communitiesQuery);
    for (const doc of communitiesSnapshot.docs) {
      await deleteDoc(doc.ref);
    }
    
    // Clear builders
    const buildersQuery = query(collection(db, 'builders'));
    const buildersSnapshot = await getDocs(buildersQuery);
    for (const doc of buildersSnapshot.docs) {
      await deleteDoc(doc.ref);
    }
    
    console.log('Successfully cleared all data from database');
    return {
      deletedHomes: homesSnapshot.docs.length,
      deletedCommunities: communitiesSnapshot.docs.length,
      deletedBuilders: buildersSnapshot.docs.length
    };
  } catch (error) {
    console.error('Error clearing database:', error);
    throw error;
  }
};