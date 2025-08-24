import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit,
  getDocs, 
  doc, 
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  QueryConstraint,
  Timestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { Home, Builder, Community, HomeWithRelations, PriceChange, PriceChangeWithRelations, PriceHistory, PriceHistoryWithRelations } from '@/types';

export const getHomes = async (filters?: {
  builderId?: string;
  communityId?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  status?: string;
}): Promise<HomeWithRelations[]> => {
  const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc')];
  
  if (filters) {
    if (filters.builderId) constraints.push(where('builderId', '==', filters.builderId));
    if (filters.communityId) constraints.push(where('communityId', '==', filters.communityId));
    if (filters.minPrice) constraints.push(where('price', '>=', filters.minPrice));
    if (filters.maxPrice) constraints.push(where('price', '<=', filters.maxPrice));
    if (filters.bedrooms) constraints.push(where('bedrooms', '==', filters.bedrooms));
    if (filters.status) constraints.push(where('status', '==', filters.status));
  }
  
  const q = query(collection(db, 'homes'), ...constraints);
  const querySnapshot = await getDocs(q);
  
  const homes: HomeWithRelations[] = [];
  
  for (const docSnap of querySnapshot.docs) {
    const homeData = { id: docSnap.id, ...docSnap.data() } as Home;
    
    const builder = await getBuilder(homeData.builderId);
    const community = await getCommunity(homeData.communityId);
    
    homes.push({
      ...homeData,
      builder,
      community
    });
  }
  
  return homes;
};

export const getHome = async (id: string): Promise<HomeWithRelations | undefined> => {
  const docRef = doc(db, 'homes', id);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    const homeData = { id: docSnap.id, ...docSnap.data() } as Home;
    
    const builder = await getBuilder(homeData.builderId);
    const community = await getCommunity(homeData.communityId);
    
    return {
      ...homeData,
      builder,
      community
    };
  }
  
  return undefined;
};

export const getBuilders = async (): Promise<Builder[]> => {
  const querySnapshot = await getDocs(collection(db, 'builders'));
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Builder));
};

export const getBuilder = async (id: string): Promise<Builder | undefined> => {
  const docRef = doc(db, 'builders', id);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Builder;
  }
  
  return undefined;
};

export const getCommunities = async (builderId?: string): Promise<Community[]> => {
  let q = query(collection(db, 'communities'));
  
  if (builderId) {
    q = query(collection(db, 'communities'), where('builderId', '==', builderId));
  }
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Community));
};

export const getCommunity = async (id: string): Promise<Community | undefined> => {
  const docRef = doc(db, 'communities', id);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Community;
  }
  
  return undefined;
};

export const addHome = async (homeData: Omit<Home, 'id'>) => {
  const docRef = await addDoc(collection(db, 'homes'), homeData);
  return docRef.id;
};

export const updateHome = async (id: string, homeData: Partial<Home>) => {
  const docRef = doc(db, 'homes', id);
  await updateDoc(docRef, homeData);
};

export const deleteHome = async (id: string) => {
  const docRef = doc(db, 'homes', id);
  await deleteDoc(docRef);
};

// Alias for consistency
export const getHomeById = getHome;

export const findHomeByAttributes = async (
  modelName: string,
  builderId: string,
  communityId: string,
  address?: string
): Promise<HomeWithRelations | undefined> => {
  const constraints: QueryConstraint[] = [
    where('modelName', '==', modelName),
    where('builderId', '==', builderId),
    where('communityId', '==', communityId)
  ];
  
  if (address) {
    constraints.push(where('address', '==', address));
  }
  
  constraints.push(limit(1));
  
  const q = query(collection(db, 'homes'), ...constraints);
  const querySnapshot = await getDocs(q);
  
  if (!querySnapshot.empty) {
    const docSnap = querySnapshot.docs[0];
    const homeData = { id: docSnap.id, ...docSnap.data() } as Home;
    
    const builder = await getBuilder(homeData.builderId);
    const community = await getCommunity(homeData.communityId);
    
    return {
      ...homeData,
      builder,
      community
    };
  }
  
  return undefined;
};

// Price Change Functions

export const addPriceChange = async (priceChangeData: Omit<PriceChange, 'id'>) => {
  const docRef = await addDoc(collection(db, 'priceChanges'), priceChangeData);
  return docRef.id;
};

export const getPriceChanges = async (options?: {
  builderId?: string;
  daysBack?: number;
  limitCount?: number;
}): Promise<PriceChangeWithRelations[]> => {
  const constraints: QueryConstraint[] = [orderBy('changeDate', 'desc')];
  
  // Default to 90 days back
  const daysBack = options?.daysBack || 90;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);
  constraints.push(where('changeDate', '>=', Timestamp.fromDate(cutoffDate)));
  
  if (options?.builderId) {
    constraints.push(where('builderId', '==', options.builderId));
  }
  
  if (options?.limitCount) {
    constraints.push(limit(options.limitCount));
  }
  
  const q = query(collection(db, 'priceChanges'), ...constraints);
  const querySnapshot = await getDocs(q);
  
  const priceChanges: PriceChangeWithRelations[] = [];
  
  for (const docSnap of querySnapshot.docs) {
    const priceChangeData = { id: docSnap.id, ...docSnap.data() } as PriceChange;
    
    const builder = await getBuilder(priceChangeData.builderId);
    const community = await getCommunity(priceChangeData.communityId);
    
    priceChanges.push({
      ...priceChangeData,
      builder,
      community
    });
  }
  
  return priceChanges;
};

export const getRecentPriceChanges = async (limitCount: number = 20): Promise<PriceChangeWithRelations[]> => {
  return getPriceChanges({ limitCount, daysBack: 90 });
};

export const getPriceChangesForHome = async (homeId: string): Promise<PriceChangeWithRelations[]> => {
  try {
    // First try with orderBy
    const constraints: QueryConstraint[] = [
      where('homeId', '==', homeId),
      orderBy('changeDate', 'desc')
    ];
    
    const q = query(collection(db, 'priceChanges'), ...constraints);
    const querySnapshot = await getDocs(q);
    
    const priceChanges: PriceChangeWithRelations[] = [];
    
    for (const docSnap of querySnapshot.docs) {
      const priceChangeData = { id: docSnap.id, ...docSnap.data() } as PriceChange;
      
      const builder = await getBuilder(priceChangeData.builderId);
      const community = await getCommunity(priceChangeData.communityId);
      
      priceChanges.push({
        ...priceChangeData,
        builder,
        community
      });
    }
    
    return priceChanges;
  } catch (error) {
    console.error('Error with ordered query, trying without orderBy:', error);
    // If the ordered query fails (due to missing index), try without orderBy
    const constraints: QueryConstraint[] = [
      where('homeId', '==', homeId)
    ];
    
    const q = query(collection(db, 'priceChanges'), ...constraints);
    const querySnapshot = await getDocs(q);
    
    const priceChanges: PriceChangeWithRelations[] = [];
    
    for (const docSnap of querySnapshot.docs) {
      const priceChangeData = { id: docSnap.id, ...docSnap.data() } as PriceChange;
      
      const builder = await getBuilder(priceChangeData.builderId);
      const community = await getCommunity(priceChangeData.communityId);
      
      priceChanges.push({
        ...priceChangeData,
        builder,
        community
      });
    }
    
    // Sort manually by changeDate
    priceChanges.sort((a, b) => {
      const aSeconds = a.changeDate?.seconds || 0;
      const bSeconds = b.changeDate?.seconds || 0;
      return bSeconds - aSeconds; // desc order
    });
    
    return priceChanges;
  }
};

// Debug function to check what's in the priceChanges collection
export const debugPriceChangesCollection = async (): Promise<void> => {
  try {
    const q = query(collection(db, 'priceChanges'), limit(5));
    const querySnapshot = await getDocs(q);
    
    console.log(`=== DEBUG: Total documents in priceChanges collection (first 5): ${querySnapshot.size} ===`);
    
    querySnapshot.forEach((doc) => {
      console.log('Document ID:', doc.id);
      console.log('Document data:', doc.data());
    });
  } catch (error) {
    console.error('Error debugging priceChanges collection:', error);
  }
};

// Debug function to get all price changes for a model name
export const getAllPriceChangesForModel = async (modelName: string): Promise<PriceChangeWithRelations[]> => {
  try {
    console.log(`Debug: Getting ALL price changes for model: ${modelName}`);
    
    const q = query(
      collection(db, 'priceChanges'),
      where('modelName', '==', modelName),
      orderBy('changeDate', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    console.log(`Debug: Found ${querySnapshot.size} total price changes for ${modelName}`);
    
    const priceChanges: PriceChangeWithRelations[] = [];
    
    for (const docSnap of querySnapshot.docs) {
      const priceChangeData = { id: docSnap.id, ...docSnap.data() } as PriceChange;
      console.log('Debug: Price change data:', {
        id: priceChangeData.id,
        modelName: priceChangeData.modelName,
        builderId: priceChangeData.builderId,
        communityId: priceChangeData.communityId,
        homeId: priceChangeData.homeId,
        oldPrice: priceChangeData.oldPrice,
        newPrice: priceChangeData.newPrice
      });
      
      const builder = await getBuilder(priceChangeData.builderId);
      const community = await getCommunity(priceChangeData.communityId);
      
      priceChanges.push({
        ...priceChangeData,
        builder,
        community
      });
    }
    
    return priceChanges;
  } catch (error) {
    console.error('Error in getAllPriceChangesForModel:', error);
    // If index error, try without orderBy
    if (error instanceof Error && error.message.includes('index')) {
      const q = query(
        collection(db, 'priceChanges'),
        where('modelName', '==', modelName)
      );
      
      const querySnapshot = await getDocs(q);
      const priceChanges: PriceChangeWithRelations[] = [];
      
      for (const docSnap of querySnapshot.docs) {
        const priceChangeData = { id: docSnap.id, ...docSnap.data() } as PriceChange;
        const builder = await getBuilder(priceChangeData.builderId);
        const community = await getCommunity(priceChangeData.communityId);
        
        priceChanges.push({
          ...priceChangeData,
          builder,
          community
        });
      }
      
      // Sort manually
      priceChanges.sort((a, b) => {
        const aDate = a.changeDate?.seconds || 0;
        const bDate = b.changeDate?.seconds || 0;
        return bDate - aDate;
      });
      
      return priceChanges;
    }
    return [];
  }
};

export const getPriceChangesByModelAttributes = async (
  modelName: string,
  builderId: string,
  communityId: string
): Promise<PriceChangeWithRelations[]> => {
  try {
    console.log('Searching for price changes with:', { modelName, builderId, communityId });
    
    const constraints: QueryConstraint[] = [
      where('modelName', '==', modelName),
      where('builderId', '==', builderId),
      where('communityId', '==', communityId),
      orderBy('changeDate', 'desc')
    ];
    
    const q = query(collection(db, 'priceChanges'), ...constraints);
    const querySnapshot = await getDocs(q);
    
    console.log(`Found ${querySnapshot.size} price changes for model ${modelName}`);
    
    const priceChanges: PriceChangeWithRelations[] = [];
    
    for (const docSnap of querySnapshot.docs) {
      const priceChangeData = { id: docSnap.id, ...docSnap.data() } as PriceChange;
      
      const builder = await getBuilder(priceChangeData.builderId);
      const community = await getCommunity(priceChangeData.communityId);
      
      priceChanges.push({
        ...priceChangeData,
        builder,
        community
      });
    }
    
    return priceChanges;
  } catch (error) {
    console.error('Error in getPriceChangesByModelAttributes:', error);
    // If it's a missing index error, try without the orderBy
    if (error instanceof Error && error.message.includes('index')) {
      console.log('Retrying without orderBy due to missing index...');
      
      const constraints: QueryConstraint[] = [
        where('modelName', '==', modelName),
        where('builderId', '==', builderId),
        where('communityId', '==', communityId)
      ];
      
      const q = query(collection(db, 'priceChanges'), ...constraints);
      const querySnapshot = await getDocs(q);
      
      const priceChanges: PriceChangeWithRelations[] = [];
      
      for (const docSnap of querySnapshot.docs) {
        const priceChangeData = { id: docSnap.id, ...docSnap.data() } as PriceChange;
        
        const builder = await getBuilder(priceChangeData.builderId);
        const community = await getCommunity(priceChangeData.communityId);
        
        priceChanges.push({
          ...priceChangeData,
          builder,
          community
        });
      }
      
      // Sort manually if orderBy failed
      priceChanges.sort((a, b) => {
        const aDate = a.changeDate?.seconds || 0;
        const bDate = b.changeDate?.seconds || 0;
        return bDate - aDate;
      });
      
      return priceChanges;
    }
    throw error;
  }
};

// Price History Functions

export const addPriceHistory = async (priceHistoryData: Omit<PriceHistory, 'id'>) => {
  const docRef = await addDoc(collection(db, 'priceHistory'), priceHistoryData);
  return docRef.id;
};

export const getPriceHistory = async (homeId: string): Promise<PriceHistoryWithRelations[]> => {
  const constraints: QueryConstraint[] = [
    where('homeId', '==', homeId),
    orderBy('priceStartDate', 'desc')
  ];
  
  const q = query(collection(db, 'priceHistory'), ...constraints);
  const querySnapshot = await getDocs(q);
  
  const priceHistory: PriceHistoryWithRelations[] = [];
  
  for (const docSnap of querySnapshot.docs) {
    const historyData = { id: docSnap.id, ...docSnap.data() } as PriceHistory;
    
    const builder = await getBuilder(historyData.builderId);
    const community = await getCommunity(historyData.communityId);
    
    priceHistory.push({
      ...historyData,
      builder,
      community
    });
  }
  
  return priceHistory;
};

export const updatePriceHistory = async (homeId: string, newPrice: number): Promise<void> => {
  // Get current price history for this home
  const currentHistoryQuery = query(
    collection(db, 'priceHistory'),
    where('homeId', '==', homeId),
    where('isCurrentPrice', '==', true)
  );
  
  const currentHistorySnapshot = await getDocs(currentHistoryQuery);
  const changeDate = Timestamp.now();
  
  // Close out the current price history record
  if (!currentHistorySnapshot.empty) {
    const currentRecord = currentHistorySnapshot.docs[0];
    const currentData = currentRecord.data() as PriceHistory;
    
    // Calculate days active
    const startDate = currentData.priceStartDate.toDate();
    const endDate = changeDate.toDate();
    const daysActive = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    await updateDoc(doc(db, 'priceHistory', currentRecord.id), {
      priceEndDate: changeDate,
      daysActive,
      isCurrentPrice: false
    });
  }
};

export const initializePriceHistory = async (home: Home): Promise<string | null> => {
  // Only track competitor homes (not Dream Finders)
  const builder = await getBuilder(home.builderId);
  if (!builder || builder.name.toLowerCase().includes('dream')) {
    return null;
  }

  // Check if price history already exists for this home
  const existingHistoryQuery = query(
    collection(db, 'priceHistory'),
    where('homeId', '==', home.id)
  );
  
  const existingHistorySnapshot = await getDocs(existingHistoryQuery);
  
  // Only create initial record if none exists
  if (existingHistorySnapshot.empty) {
    const priceHistoryData: any = {
      homeId: home.id,
      builderId: home.builderId,
      communityId: home.communityId,
      modelName: home.modelName,
      price: home.price,
      priceStartDate: home.createdAt || Timestamp.now(),
      isCurrentPrice: true
    };

    // Only add optional fields if they have values
    if (home.address) {
      priceHistoryData.address = home.address;
    }
    if (home.homesiteNumber) {
      priceHistoryData.homesiteNumber = home.homesiteNumber;
    }
    
    return addPriceHistory(priceHistoryData);
  }
  
  return null;
};

export const logPriceChange = async (
  home: Home,
  oldPrice: number,
  newPrice: number
): Promise<string | null> => {
  // Only log changes for competitor homes (not Dream Finders)
  const builder = await getBuilder(home.builderId);
  if (!builder || builder.name.toLowerCase().includes('dream')) {
    return null;
  }
  
  const changeAmount = newPrice - oldPrice;
  const changePercentage = (changeAmount / oldPrice) * 100;
  const changeType = changeAmount > 0 ? 'increase' : 'decrease';
  const changeDate = Timestamp.now();
  
  // Get the date when the old price was first set
  const oldPriceHistoryQuery = query(
    collection(db, 'priceHistory'),
    where('homeId', '==', home.id),
    where('isCurrentPrice', '==', true)
  );
  
  const oldPriceHistorySnapshot = await getDocs(oldPriceHistoryQuery);
  let oldPriceDate = Timestamp.now();
  let daysSinceLastChange = 0;
  
  if (!oldPriceHistorySnapshot.empty) {
    const oldPriceRecord = oldPriceHistorySnapshot.docs[0].data() as PriceHistory;
    oldPriceDate = oldPriceRecord.priceStartDate;
    
    // Calculate days since last change
    const startDate = oldPriceDate.toDate();
    const endDate = changeDate.toDate();
    daysSinceLastChange = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  }
  
  // Update price history - close old record and create new one
  await updatePriceHistory(home.id, newPrice);
  
  // Create new price history record
  const newPriceHistoryData: any = {
    homeId: home.id,
    builderId: home.builderId,
    communityId: home.communityId,
    modelName: home.modelName,
    price: newPrice,
    priceStartDate: changeDate,
    isCurrentPrice: true
  };

  // Only add optional fields if they have values
  if (home.address) {
    newPriceHistoryData.address = home.address;
  }
  if (home.homesiteNumber) {
    newPriceHistoryData.homesiteNumber = home.homesiteNumber;
  }
  
  await addPriceHistory(newPriceHistoryData);
  
  // Log the price change with enhanced date tracking
  const priceChangeData: any = {
    homeId: home.id,
    builderId: home.builderId,
    communityId: home.communityId,
    modelName: home.modelName,
    oldPrice,
    newPrice,
    changeAmount,
    changePercentage,
    oldPriceDate,
    changeDate,
    changeType,
    daysSinceLastChange
  };

  // Only add optional fields if they have values
  if (home.address) {
    priceChangeData.address = home.address;
  }
  if (home.homesiteNumber) {
    priceChangeData.homesiteNumber = home.homesiteNumber;
  }
  
  return addPriceChange(priceChangeData);
};