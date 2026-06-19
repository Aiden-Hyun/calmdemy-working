/**
 * /journal/[id] route — thin wrapper.
 *
 * The entry detail UI is EntryDetailScreen (src/features/journal/). This file
 * only reads the route param and applies the auth gate.
 */

import { useLocalSearchParams } from 'expo-router';
import { ProtectedRoute } from '../../src/core/auth/ProtectedRoute';
import { EntryDetailScreen } from '../../src/features/journal';

export default function JournalEntryDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return (
    <ProtectedRoute>
      <EntryDetailScreen entryId={id} />
    </ProtectedRoute>
  );
}
