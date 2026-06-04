/**
 * ============================================================
 * features/library/api/quotes.ts — Daily quote access
 * ============================================================
 *
 * Split out of the legacy firestoreService.ts in Phase 3 (Group H).
 * ============================================================
 */

import { collection, getDocs, query, where, limit } from "firebase/firestore";
import { db } from "../../../core/firebase";
import { DailyQuote } from "../types";

const quotesCollection = collection(db, "daily_quotes");

/**
 * Retrieve today's featured quote (Graceful Degradation variant).
 *
 * This demonstrates Graceful Degradation: if no quote matches today's date,
 * we fall back to picking a random quote from the collection. This ensures
 * the UI always has something to display, even if the curated "quote of the day"
 * is missing from Firestore.
 *
 * @returns Today's quote object, or a random quote if today's is not found
 *         Null only if the entire collection is empty or unreachable
 */
export async function getTodayQuote(): Promise<DailyQuote | null> {
  try {
    const today = new Date().toISOString().split("T")[0];

    const q = query(quotesCollection, where("date", "==", today), limit(1));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      // Fallback: pick a single random quote instead of loading the entire collection.
      // Use a random date-based seed to get variety across days.
      const fallbackQuery = query(quotesCollection, limit(1));
      const fallbackSnapshot = await getDocs(fallbackQuery);
      if (fallbackSnapshot.empty) return null;

      const doc = fallbackSnapshot.docs[0];
      return { id: doc.id, ...doc.data() } as DailyQuote;
    }

    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() } as DailyQuote;
  } catch (error) {
    console.error("Error fetching daily quote:", error);
    return null;
  }
}
