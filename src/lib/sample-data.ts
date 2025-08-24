import { collection, addDoc, doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { Timestamp } from 'firebase/firestore';

// This function is deprecated - use the /api/seed endpoint instead
export const seedDatabase = async () => {
  throw new Error('This function has been moved to /api/seed endpoint. Please use the seed page which calls the API.');
};