import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBejrg3_W2Zdo5YpwR5XrF0kSe2fnrqAPo",
  authDomain: "homeintelligence-e2202.firebaseapp.com",
  projectId: "homeintelligence-e2202",
  storageBucket: "homeintelligence-e2202.firebasestorage.app",
  messagingSenderId: "916919546003",
  appId: "1:916919546003:web:53bf3dc01282e791d39d66"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;