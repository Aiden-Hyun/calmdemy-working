/**
 * /account-security route — thin wrapper.
 *
 * All logic lives in the auth feature module (src/features/auth/).
 */

import { AccountSecurityScreen } from '../src/features/auth';

export default function AccountSecurity() {
  return <AccountSecurityScreen />;
}
