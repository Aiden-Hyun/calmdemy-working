/**
 * ============================================================
 * firebase.ts — Firebase SDK Initialization & Singleton Exports
 * ============================================================
 *
 * Architectural Role:
 *   This module is the single source of truth for Firebase backend
 *   integration. It initializes the Firebase app once and exports
 *   auth, db, and storage references so all feature modules can
 *   import and use them without re-initializing.
 *
 * Design Patterns:
 *   - Singleton Pattern: Firebase services are initialized once and
 *     exported as module-level constants. All imports reference the
 *     same instances (no instantiation overhead).
 *   - Facade Pattern: Helper functions (getCurrentUserId, isAuthenticated)
 *     wrap Firebase auth API with app-specific semantics.
 *   - Persistence Strategy: initializeAuth() configures AsyncStorage
 *     as the persistence layer, so auth tokens survive app restart
 *     without re-login.
 *
 * Key Dependencies:
 *   - firebase/app, firebase/auth, firebase/firestore, firebase/storage
 *   - AsyncStorage: React Native persistent storage (for auth tokens)
 *
 * Consumed By:
 *   All feature modules and services that need auth, Firestore data,
 *   or Cloud Storage access.
 *
 * Configuration:
 *   Firebase credentials are embedded here (apiKey, projectId, etc.).
 *   In production, these should be environment variables or
 *   google-services.json/GoogleService-Info.plist auto-linking.
 * ============================================================
 */

import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- Firebase Configuration ---

/**
 * Firebase project configuration.
 *
 * These credentials are from google-services.json (Android) or
 * GoogleService-Info.plist (iOS). The apiKey is not sensitive
 * (it's client-side and has security rules enforced server-side).
 */
const firebaseConfig = {
  apiKey: "AIzaSyDkCd6LiHEhvn_i10bvLwM11kotU3Gpbb0",
  authDomain: "calmnest-e910e.firebaseapp.com",
  projectId: "calmnest-e910e",
  storageBucket: "calmnest-e910e.firebasestorage.app",
  messagingSenderId: "1012641376582",
  appId: "1:1012641376582:android:9ed0b2e187aeb9cb375d47"
};

// --- Initialization ---

/**
 * Initialize Firebase app (Singleton).
 *
 * This happens once per app lifecycle. All subsequent imports
 * of auth, db, or storage reference this single instance.
 */
const app = initializeApp(firebaseConfig);

/**
 * Firebase Authentication reference.
 *
 * Configured with AsyncStorage persistence so authentication tokens
 * are saved to disk. On app restart, the SDK automatically restores
 * the logged-in user without requiring re-login (unless the token expired).
 * This is the Persistence strategy for mobile apps.
 */
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

/**
 * Firestore database reference.
 *
 * All data queries (getTodayQuote, getEmergencyMeditations, etc.)
 * are executed against this instance. Firestore is the single source
 * of truth for app content, user data, and listening subscriptions.
 */
export const db = getFirestore(app);

/**
 * Firebase Cloud Storage reference.
 *
 * Used to fetch download URLs for audio and image assets.
 * All content (meditations, stories, music) are stored in Cloud Storage
 * and accessed via getDownloadURL() with temporary download tokens.
 */
export const storage = getStorage(app);

// --- Helper Functions (Facade Pattern) ---

/**
 * Get the currently authenticated user's ID.
 *
 * Facade for auth.currentUser?.uid. Returns null if user is not logged in.
 * Used to partition user data (history, favorites, preferences) in queries.
 *
 * @returns User ID (UID) or null if not authenticated
 */
export const getCurrentUserId = (): string | null => {
  return auth.currentUser?.uid ?? null;
};

/**
 * Check if a user is currently authenticated.
 *
 * Facade for auth.currentUser !== null. Used to gate features
 * (favorites, history, subscription) that require authentication.
 *
 * @returns true if user is logged in, false otherwise
 */
export const isAuthenticated = (): boolean => {
  return auth.currentUser !== null;
};
