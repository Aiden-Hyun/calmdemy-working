/**
 * /downloads/player route — thin wrapper.
 *
 * All logic lives in the downloads feature module (src/features/downloads/).
 * The offline player gates on auth (unlike the downloads list).
 */

import { ProtectedRoute } from '../../src/core/auth/ProtectedRoute';
import { OfflinePlayerScreen } from '../../src/features/downloads';

export default function OfflinePlayer() {
  return (
    <ProtectedRoute>
      <OfflinePlayerScreen />
    </ProtectedRoute>
  );
}
