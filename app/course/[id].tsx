/**
 * /course/[id] route — thin wrapper.
 *
 * The course detail UI is the unified library CollectionDetailScreen
 * (src/features/library/). This file only reads route params and applies
 * the auth gate. Route URL is unchanged (deep links depend on it).
 */

import { useLocalSearchParams } from 'expo-router';
import { ProtectedRoute } from '../../src/core/auth/ProtectedRoute';
import { CollectionDetailScreen } from '../../src/features/library';

export default function CourseDetail() {
  const { id, autoOpenItemId } = useLocalSearchParams<{
    id: string;
    autoOpenItemId?: string;
  }>();
  return (
    <ProtectedRoute>
      <CollectionDetailScreen contentType="course" id={id} autoOpenItemId={autoOpenItemId} />
    </ProtectedRoute>
  );
}
