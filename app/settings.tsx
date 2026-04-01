import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView, Alert, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import { useTheme, ThemeMode } from '../src/contexts/ThemeContext';
import { useSubscription } from '../src/contexts/SubscriptionContext';
import { ProtectedRoute } from '../src/components/ProtectedRoute';

const themeModes: { id: ThemeMode; label: string; icon: string }[] = [
  { id: 'light', label: 'Light', icon: 'sunny-outline' },
  { id: 'dark', label: 'Dark', icon: 'moon-outline' },
  { id: 'system', label: 'System', icon: 'phone-portrait-outline' },
];

function SettingsScreen() {
  const router = useRouter();
  const { user, logout, deleteAccount, isAnonymous } = useAuth();
  const { theme, themeMode, setThemeMode } = useTheme();
  const { isPremium } = useSubscription();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  const styles = useMemo(() => createStyles(theme), [theme]);

  // Determine auth provider
  const providerData = user?.providerData || [];
  const isEmailProvider = providerData.some(p => p.providerId === 'password');
  const isGoogleProvider = providerData.some(p => p.providerId === 'google.com');
  const isAppleProvider = providerData.some(p => p.providerId === 'apple.com');

  const handleDeleteAccount = () => {
    if (isEmailProvider) {
      // Email users need to enter password
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
        `This action is permanent and cannot be undone. All your data will be deleted.\n\nYou will be asked to sign in with ${isGoogleProvider ? 'Google' : isAppleProvider ? 'Apple' : 'your account'} to confirm.`,
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

  const performDeleteAccount = async (password?: string) => {
    setIsDeleting(true);
    try {
      await deleteAccount(password);
      // User will be automatically signed out and redirected
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message || 'Failed to delete account. Please try again.'
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.card}>
            {isAnonymous ? (
              <>
                <View style={styles.settingItem}>
                  <View style={styles.settingLeft}>
                    <Ionicons name="person-outline" size={20} color={theme.colors.text} />
                    <Text style={styles.settingLabel}>Status</Text>
                  </View>
                  <Text style={styles.settingValue}>Guest</Text>
                </View>
                <View style={styles.divider} />
                <TouchableOpacity 
                  style={styles.actionItem}
                  onPress={() => router.push(isPremium ? '/login?mode=link' : '/login')}
                >
                  <View style={styles.settingLeft}>
                    <Ionicons 
                      name={isPremium ? "link-outline" : "log-in-outline"} 
                      size={20} 
                      color={theme.colors.primary} 
                    />
                    <Text style={[styles.settingLabel, { color: theme.colors.primary }]}>
                      {isPremium ? "Link Account" : "Sign In"}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.colors.primary} />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.settingItem}>
                  <View style={styles.settingLeft}>
                    <Ionicons name="mail-outline" size={20} color={theme.colors.text} />
                    <Text style={styles.settingLabel}>Email</Text>
                  </View>
                  <Text style={styles.settingValue}>{user?.email}</Text>
                </View>
                <View style={styles.divider} />
                <TouchableOpacity
                  style={styles.actionItem}
                  onPress={() => router.push('/account-security')}
                >
                  <View style={styles.settingLeft}>
                    <Ionicons name="shield-checkmark-outline" size={20} color={theme.colors.text} />
                    <Text style={styles.settingLabel}>Account Security</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
        
        {/* Appearance Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <View style={styles.card}>
            <Text style={styles.themeLabel}>Theme</Text>
            <View style={styles.themeSelector}>
              {themeModes.map((mode) => (
                <TouchableOpacity
                  key={mode.id}
                  style={[
                    styles.themeOption,
                    themeMode === mode.id && styles.themeOptionSelected,
                  ]}
                  onPress={() => setThemeMode(mode.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons 
                    name={mode.icon as any} 
                    size={20} 
                    color={themeMode === mode.id ? theme.colors.textOnPrimary : theme.colors.text} 
                  />
                  <Text style={[
                    styles.themeOptionText,
                    themeMode === mode.id && styles.themeOptionTextSelected,
                  ]}>
                    {mode.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Preferences Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <View style={styles.card}>
          <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="notifications-outline" size={20} color={theme.colors.text} />
            <Text style={styles.settingLabel}>Notifications</Text>
              </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
                trackColor={{ false: theme.colors.gray[300], true: theme.colors.primary }}
                thumbColor="white"
            />
          </View>
          </View>
        </View>
        
        
        {/* Actions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal</Text>
          <View style={styles.card}>
            <TouchableOpacity 
              style={styles.actionItem}
              onPress={() => router.push('/privacy')}
            >
              <View style={styles.settingLeft}>
                <Ionicons name="shield-outline" size={20} color={theme.colors.text} />
                <Text style={styles.settingLabel}>Privacy Policy</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>
            
            <View style={styles.divider} />
            
            <TouchableOpacity 
              style={styles.actionItem}
              onPress={() => router.push('/terms')}
            >
              <View style={styles.settingLeft}>
                <Ionicons name="document-text-outline" size={20} color={theme.colors.text} />
                <Text style={styles.settingLabel}>Terms of Service</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>
      </View>
    </View>

        {/* Sign Out - only show for authenticated users */}
        {!isAnonymous && (
          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <Ionicons name="log-out-outline" size={20} color={theme.colors.error} />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        )}

        {/* Danger Zone - only show for authenticated users */}
        {!isAnonymous && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, styles.dangerSectionTitle]}>Danger Zone</Text>
            <View style={[styles.card, styles.dangerCard]}>
              <TouchableOpacity 
                style={styles.deleteAccountButton}
                onPress={handleDeleteAccount}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color={theme.colors.error} />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
                    <Text style={styles.deleteAccountText}>Delete Account</Text>
                  </>
                )}
              </TouchableOpacity>
              <Text style={styles.deleteWarning}>
                This will permanently delete your account and all associated data.
              </Text>
            </View>
          </View>
        )}

        {/* Version */}
        <Text style={styles.version}>Calmdemy v1.0.2</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: ReturnType<typeof import('../src/theme').createTheme>) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    backButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 17,
      color: theme.colors.text,
    },
    headerSpacer: {
      width: 40,
    },
  container: {
    flex: 1,
      padding: theme.spacing.lg,
  },
  section: {
      marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 13,
      color: theme.colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: theme.spacing.sm,
      marginLeft: theme.spacing.xs,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xl,
      padding: theme.spacing.md,
      ...theme.shadows.sm,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.sm,
    },
    settingLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
  },
  settingLabel: {
      fontFamily: theme.fonts.ui.regular,
    fontSize: 16,
      color: theme.colors.text,
  },
  settingValue: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 14,
      color: theme.colors.textLight,
    },
    themeLabel: {
      fontFamily: theme.fonts.ui.medium,
      fontSize: 14,
      color: theme.colors.textLight,
      marginBottom: theme.spacing.md,
      marginLeft: theme.spacing.sm,
    },
    themeSelector: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    themeOption: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.xs,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: theme.borderRadius.lg,
      backgroundColor: theme.colors.gray[100],
    },
    themeOptionSelected: {
      backgroundColor: theme.colors.primary,
    },
    themeOptionText: {
      fontFamily: theme.fonts.ui.medium,
    fontSize: 14,
      color: theme.colors.text,
    },
    themeOptionTextSelected: {
      color: theme.colors.textOnPrimary,
  },
    actionItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.sm,
    },
    divider: {
      height: 1,
      backgroundColor: theme.colors.gray[200],
      marginHorizontal: theme.spacing.sm,
    },
    logoutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
    borderWidth: 1,
      borderColor: theme.colors.error,
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.lg,
  },
    logoutText: {
      fontFamily: theme.fonts.ui.medium,
    fontSize: 16,
      color: theme.colors.error,
  },
    version: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 12,
      color: theme.colors.textMuted,
      textAlign: 'center',
      marginBottom: theme.spacing.xxl,
    },
    dangerSectionTitle: {
      color: theme.colors.error,
    },
    dangerCard: {
      borderWidth: 1,
      borderColor: `${theme.colors.error}30`,
    },
    deleteAccountButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    deleteAccountText: {
      fontFamily: theme.fonts.ui.medium,
      fontSize: 16,
      color: theme.colors.error,
    },
    deleteWarning: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 12,
      color: theme.colors.textMuted,
      textAlign: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
    },
});

export default function Settings() {
  return (
    <ProtectedRoute>
      <SettingsScreen />
    </ProtectedRoute>
  );
}
