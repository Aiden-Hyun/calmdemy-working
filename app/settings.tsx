/**
 * /settings route — thin wrapper.
 *
 * All logic lives in the settings feature module (src/features/settings/).
 * This file only owns the auth gate required by the manifest's
 * `requiresAuth: true`.
 */

import { ProtectedRoute } from '../src/core/auth/ProtectedRoute';
import { SettingsScreen } from '../src/features/settings';

export default function Settings() {
  return (
    <ProtectedRoute>
      <SettingsScreen />
    </ProtectedRoute>
  );
}
