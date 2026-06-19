/**
 * /mood route — thin wrapper.
 *
 * All logic lives in the mood feature module (src/features/mood/). This file
 * only owns the auth gate required by the manifest's `requiresAuth: true`.
 */

import { ProtectedRoute } from '../src/core/auth/ProtectedRoute';
import { MoodHomeScreen } from '../src/features/mood';

export default function Mood() {
  return (
    <ProtectedRoute>
      <MoodHomeScreen />
    </ProtectedRoute>
  );
}
