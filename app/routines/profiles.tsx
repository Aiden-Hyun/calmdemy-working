/**
 * /routines/profiles route — thin wrapper.
 *
 * Manage routine profiles. All logic lives in the routines feature module.
 */

import { ProtectedRoute } from '../../src/core/auth/ProtectedRoute';
import { ProfilesScreen } from '../../src/features/routines';

export default function Profiles() {
  return (
    <ProtectedRoute>
      <ProfilesScreen />
    </ProtectedRoute>
  );
}
