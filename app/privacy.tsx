/**
 * /privacy route — thin wrapper.
 *
 * All logic lives in the legal feature module (src/features/legal/).
 * Privacy/terms are public content, so there's no ProtectedRoute gate.
 */

import { PrivacyScreen } from '../src/features/legal';

export default function Privacy() {
  return <PrivacyScreen />;
}
