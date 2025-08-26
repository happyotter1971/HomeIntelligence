import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PriceEvaluation } from '@/lib/openai/types';

export interface StoredEvaluation {
  homeId: string;
  evaluation: PriceEvaluation;
  evaluatedAt: Timestamp;
  homeData: {
    modelName: string;
    price: number;
    address: string;
    builderName: string;
    communityName: string;
  };
}

export async function storeEvaluation(
  homeId: string, 
  evaluation: PriceEvaluation,
  homeData: {
    modelName: string;
    price: number;
    address: string;
    builderName: string;
    communityName: string;
  }
): Promise<void> {
  const evaluationDoc: StoredEvaluation = {
    homeId,
    evaluation,
    evaluatedAt: Timestamp.now(),
    homeData
  };

  await setDoc(
    doc(db, 'priceEvaluations', homeId), 
    evaluationDoc
  );
}

export async function getStoredEvaluation(homeId: string): Promise<StoredEvaluation | null> {
  const docRef = doc(db, 'priceEvaluations', homeId);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return docSnap.data() as StoredEvaluation;
  }
  
  return null;
}

export async function getAllStoredEvaluations(): Promise<{[homeId: string]: StoredEvaluation}> {
  const evaluationsRef = collection(db, 'priceEvaluations');
  const snapshot = await getDocs(evaluationsRef);
  
  const evaluations: {[homeId: string]: StoredEvaluation} = {};
  
  snapshot.forEach(doc => {
    const data = doc.data() as StoredEvaluation;
    evaluations[data.homeId] = data;
  });
  
  return evaluations;
}

export async function getEvaluationsForBuilder(builderName: string): Promise<{[homeId: string]: StoredEvaluation}> {
  const evaluationsRef = collection(db, 'priceEvaluations');
  const q = query(evaluationsRef, where('homeData.builderName', '==', builderName));
  const snapshot = await getDocs(q);
  
  const evaluations: {[homeId: string]: StoredEvaluation} = {};
  
  snapshot.forEach(doc => {
    const data = doc.data() as StoredEvaluation;
    evaluations[data.homeId] = data;
  });
  
  return evaluations;
}