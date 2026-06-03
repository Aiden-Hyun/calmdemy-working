/**
 * /downloads route — thin wrapper.
 *
 * All logic lives in the downloads feature module (src/features/downloads/).
 * No ProtectedRoute: the downloads list is reachable offline without auth
 * (manifest `requiresAuth: false`).
 */

import { DownloadsScreen } from '../../src/features/downloads';

export default function Downloads() {
  return <DownloadsScreen />;
}
