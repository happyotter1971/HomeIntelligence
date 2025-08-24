import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  doc, 
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  QueryConstraint
} from 'firebase/firestore';
import { db } from './firebase';
import { Home, Builder, Community, HomeWithRelations } from '@/types';

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

export const getHome = async (id: string): Promise<HomeWithRelations | null> => {
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
  
  return null;
};

export const getBuilders = async (): Promise<Builder[]> => {
  const querySnapshot = await getDocs(collection(db, 'builders'));
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as Builder));
};

export const getBuilder = async (id: string): Promise<Builder | null> => {
  const docRef = doc(db, 'builders', id);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Builder;
  }
  
  return null;
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

export const getCommunity = async (id: string): Promise<Community | null> => {
  const docRef = doc(db, 'communities', id);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Community;
  }
  
  return null;
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