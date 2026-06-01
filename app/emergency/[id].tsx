/**
 * /emergency/[id] route — thin wrapper.
 *
 * All logic lives in the emergency feature module
 * (src/features/emergency/). This file only owns the auth gate required
 * by the manifest's `requiresAuth: true`.
 */

import { ProtectedRoute } from "../../src/core/auth/ProtectedRoute";
import { EmergencyPlayerScreen } from "../../src/features/emergency";

export default function EmergencyPlayer() {
  return (
    <ProtectedRoute>
      <EmergencyPlayerScreen />
    </ProtectedRoute>
  );
}
