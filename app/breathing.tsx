/**
 * /breathing route — thin wrapper.
 *
 * All logic lives in the breathing feature module
 * (src/features/breathing/). This file only owns the auth gate
 * required by the manifest's `requiresAuth: true`.
 */

import { ProtectedRoute } from '../src/core/auth/ProtectedRoute';
import { BreathingScreen } from '../src/features/breathing';

export default function Breathing() {
  return (
    <ProtectedRoute>
      <BreathingScreen />
    </ProtectedRoute>
  );
}
