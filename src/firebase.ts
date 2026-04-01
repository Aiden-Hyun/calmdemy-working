import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Your Firebase config from google-services.json
const firebaseConfig = {
  apiKey: "AIzaSyDkCd6LiHEhvn_i10bvLwM11kotU3Gpbb0",
  authDomain: "calmnest-e910e.firebaseapp.com",
  projectId: "calmnest-e910e",
  storageBucket: "calmnest-e910e.firebasestorage.app",
  messagingSenderId: "1012641376582",
  appId: "1:1012641376582:android:9ed0b2e187aeb9cb375d47"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with AsyncStorage persistence for React Native
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Initialize Firestore
export const db = getFirestore(app);

// Initialize Storage
export const storage = getStorage(app);

// Helper to get current user ID
export const getCurrentUserId = (): string | null => {
  return auth.currentUser?.uid ?? null;
};

// Helper to check if user is authenticated
export const isAuthenticated = (): boolean => {
  return auth.currentUser !== null;
};
