import { 
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, setDoc, getDoc, Timestamp } from 'firebase/firestore';
import { auth, db } from './firebase';
import { User } from '@/types';

export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  const userCredential = await signInWithPopup(auth, provider);
  const user = userCredential.user;
  
  const existingUser = await getUserData(user.uid);
  
  if (!existingUser) {
    const userData: Omit<User, 'uid'> = {
      email: user.email!,
      displayName: user.displayName || undefined,
      role: 'user',
      createdAt: Timestamp.now(),
      lastLogin: Timestamp.now()
    };
    
    await setDoc(doc(db, 'users', user.uid), userData);
  } else {
    await setDoc(doc(db, 'users', user.uid), {
      lastLogin: Timestamp.now()
    }, { merge: true });
  }
  
  return user;
};

export const signOut = async () => {
  await firebaseSignOut(auth);
};

export const getCurrentUser = (): Promise<FirebaseUser | null> => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
};

export const getUserData = async (uid: string): Promise<User | undefined> => {
  const docRef = doc(db, 'users', uid);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return { uid, ...docSnap.data() } as User;
  }
  return undefined;
};