/**
 * /course/session/[id] route — thin wrapper.
 *
 * The course-session player UI is the unified library
 * CollectionItemPlayerScreen (src/features/library/), which reads the
 * route params itself. This file only applies the auth gate. Route URL is
 * unchanged (deep links depend on it).
 */

import { ProtectedRoute } from '../../../src/core/auth/ProtectedRoute';
import { CollectionItemPlayerScreen } from '../../../src/features/library';

export default function CourseSessionPlayer() {
  return (
    <ProtectedRoute>
      <CollectionItemPlayerScreen contentType="course" />
    </ProtectedRoute>
  );
}
