/**
 * ============================================================
 * features/auth/index.ts — Public API
 * ============================================================
 *
 * The only externally-visible surface of the auth feature. Code outside
 * features/auth/ may import ONLY the symbols re-exported here (Phase 8 makes
 * this machine-checked).
 *
 * - LoginScreen — rendered by app/login.tsx (route file)
 * - AccountSecurityScreen — rendered by app/account-security.tsx (route file)
 * - AccountPromptModal — consumed by PaywallModal (subscription) to prompt
 *   anonymous users to link an account after purchase
 * - useStartupRoute — bootstrap routing, consumed by app/index.tsx
 * - useAccountDeletion — delete-account flow, consumed by settings
 * - manifest — consumed by src/registry.ts (Phase 7)
 *
 * The other modals (AccountSwitchWarning, AccountSwitchConfirmModal,
 * CredentialCollisionModal) are internal — consumed only by auth's own
 * screens and AccountPromptModal. The AccountSwitch* consolidation is
 * deferred to Phase 6d (the two have different props/UX, not a clean swap).
 * ============================================================
 */

export { LoginScreen } from './screens/LoginScreen';
export { AccountSecurityScreen } from './screens/AccountSecurityScreen';
export { AccountPromptModal } from './components/AccountPromptModal';
export { useStartupRoute } from './bootstrap/useStartupRoute';
export { useAccountDeletion } from './hooks/useAccountDeletion';
export { manifest } from './manifest';
