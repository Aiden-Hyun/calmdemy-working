/**
 * /routines/trackers route — thin wrapper.
 */

import { ProtectedRoute } from '../../src/core/auth/ProtectedRoute';
import { TrackersScreen } from '../../src/features/routines';

export default function Trackers() {
  return (
    <ProtectedRoute>
      <TrackersScreen />
    </ProtectedRoute>
  );
}
