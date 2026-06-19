/**
 * /journal route — thin wrapper.
 *
 * All logic lives in the journal feature module (src/features/journal/).
 * This file only owns the auth gate required by the manifest's
 * `requiresAuth: true`.
 */

import { ProtectedRoute } from '../src/core/auth/ProtectedRoute';
import { JournalHomeScreen } from '../src/features/journal';

export default function Journal() {
  return (
    <ProtectedRoute>
      <JournalHomeScreen />
    </ProtectedRoute>
  );
}
