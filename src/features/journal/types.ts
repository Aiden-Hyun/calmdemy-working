/**
 * ============================================================
 * features/journal/types.ts — Journal feature domain types
 * ============================================================
 *
 * Owned by the journal feature. Other features must not import these
 * directly; surface them through index.ts if a cross-feature need ever
 * arises (Phase 8 makes that machine-checked).
 * ============================================================
 */

/**
 * A single journal entry.
 *
 * Append-only in v1 — no edit/delete. `createdAt` is epoch milliseconds
 * (Date.now()), kept as a plain number so the type is honest end-to-end
 * (no Firestore Timestamp conversion on read).
 *
 * Firestore path: users/{userId}/journalEntries/{id}
 */
export interface JournalEntry {
  id: string;
  userId: string;
  text: string;
  /** Id of the starter prompt the entry was written against, if any. */
  promptId?: string;
  createdAt: number;
}

/**
 * A starter prompt the user can optionally write against. Static content
 * (see data/prompts.ts) — not persisted; only `promptId` is stored on an entry.
 */
export interface JournalPrompt {
  id: string;
  text: string;
}
