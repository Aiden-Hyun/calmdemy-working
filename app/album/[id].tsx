/**
 * /album/[id] route — thin wrapper.
 *
 * The album detail UI is the unified library CollectionDetailScreen
 * (src/features/library/). This file only reads route params and applies
 * the auth gate. Route URL is unchanged (deep links depend on it).
 */

import { useLocalSearchParams } from 'expo-router';
import { ProtectedRoute } from '../../src/core/auth/ProtectedRoute';
import { CollectionDetailScreen } from '../../src/features/library';

export default function AlbumDetail() {
  const { id, autoOpenItemId } = useLocalSearchParams<{
    id: string;
    autoOpenItemId?: string;
  }>();
  return (
    <ProtectedRoute>
      <CollectionDetailScreen contentType="album" id={id} autoOpenItemId={autoOpenItemId} />
    </ProtectedRoute>
  );
}
