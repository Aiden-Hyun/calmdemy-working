/**
 * ============================================================
 * features/auth/hooks/useAccountDeletion.ts — Delete-account flow
 * ============================================================
 *
 * Encapsulates the account-deletion UX: a provider-aware confirmation
 * (password prompt for email users, re-auth notice for Google/Apple) and the
 * call into AuthContext.deleteAccount. Extracted from the settings screen in
 * Phase 6c; settings consumes it via the auth feature's public index.
 *
 * Returns the in-flight flag and the handler the delete button wires to.
 * ============================================================
 */

import { useState } from 'react';
import { Alert } from 'react-native';
import { useAuth } from '../../../core/auth/AuthContext';

export function useAccountDeletion() {
  const { user, deleteAccount } = useAuth();
  const [isDeleting, setIsDeleting] = useState(false);

  const providerData = user?.providerData || [];
  const isEmailProvider = providerData.some((p) => p.providerId === 'password');
  const isGoogleProvider = providerData.some((p) => p.providerId === 'google.com');
  const isAppleProvider = providerData.some((p) => p.providerId === 'apple.com');

  const performDeleteAccount = async (password?: string) => {
    setIsDeleting(true);
    try {
      await deleteAccount(password);
      // User will be automatically signed out and redirected
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to delete account. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteAccount = () => {
    if (isEmailProvider) {
      // Email users need to enter their password to confirm
      Alert.prompt(
        'Delete Account',
        'This action is permanent and cannot be undone. All your data will be deleted.\n\nEnter your password to confirm:',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async (password) => {
              if (!password) {
                Alert.alert('Error', 'Password is required');
                return;
              }
              await performDeleteAccount(password);
            },
          },
        ],
        'secure-text'
      );
    } else {
      // Google/Apple users will be prompted to re-authenticate
      Alert.alert(
        'Delete Account',
        `This action is permanent and cannot be undone. All your data will be deleted.\n\nYou will be asked to sign in with ${
          isGoogleProvider ? 'Google' : isAppleProvider ? 'Apple' : 'your account'
        } to confirm.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: () => performDeleteAccount(),
          },
        ]
      );
    }
  };

  return { isDeleting, handleDeleteAccount };
}
