/**
 * /login route — thin wrapper.
 *
 * All logic lives in the auth feature module (src/features/auth/). No
 * ProtectedRoute: this IS the authentication entry (manifest `requiresAuth: false`).
 */

import { LoginScreen } from '../src/features/auth';

export default function Login() {
  return <LoginScreen />;
}
