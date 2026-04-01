import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../src/contexts/ThemeContext';
import { Theme } from '../../src/theme';
import { useNetwork } from '../../src/contexts/NetworkContext';
import {
  getDownloadedContent,
  deleteDownload,
  deleteAllDownloads,
  getTotalStorageUsed,
  formatFileSize,
  DownloadedContent,
} from '../../src/services/downloadService';

export default function DownloadsScreen() {
  const router = useRouter();
  const { theme, isDark } = useTheme();
  const { isOffline, refresh: refreshNetwork } = useNetwork();
  const [downloads, setDownloads] = useState<DownloadedContent[]>([]);
  const [totalSize, setTotalSize] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [checkingConnection, setCheckingConnection] = useState(false);

  const styles = useMemo(() => createStyles(theme, isDark), [theme, isDark]);

  const loadDownloads = async () => {
    const content = await getDownloadedContent();
    setDownloads(content.sort((a, b) => b.downloadedAt - a.downloadedAt));
    const size = await getTotalStorageUsed();
    setTotalSize(size);
  };

  useEffect(() => {
    loadDownloads();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDownloads();
    setRefreshing(false);
  }, []);

  const handleRetryConnection = async () => {
    setCheckingConnection(true);
    try {
      const connected = await refreshNetwork();
      if (!connected) {
        Alert.alert('Still Offline', 'No internet connection detected. Please check your network settings.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to check connection status.');
    } finally {
      setCheckingConnection(false);
    }
  };

  const handleDeleteItem = (item: DownloadedContent) => {
    Alert.alert(
      'Delete Download',
      `Are you sure you want to delete "${item.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteDownload(item.contentId);
            loadDownloads();
          },
        },
      ]
    );
  };

  const handleDeleteAll = () => {
    if (downloads.length === 0) return;

    Alert.alert(
      'Delete All Downloads',
      'Are you sure you want to delete all downloaded content? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            await deleteAllDownloads();
            loadDownloads();
          },
        },
      ]
    );
  };

  const getContentIcon = (contentType: string): keyof typeof Ionicons.glyphMap => {
    switch (contentType) {
      case 'course_session': return 'school';
      case 'series_chapter': return 'book';
      case 'album_track': return 'musical-notes';
      case 'meditation': return 'leaf';
      case 'bedtime_story': return 'moon';
      case 'emergency': return 'flash';
      default: return 'play-circle';
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handlePlayDownload = (item: DownloadedContent, itemIndex: number) => {
    router.push({
      pathname: '/downloads/player',
      params: { contentId: item.contentId, index: String(itemIndex) },
    });
  };

  const renderItem = ({ item, index }: { item: DownloadedContent; index: number }) => (
    <TouchableOpacity 
      style={styles.downloadItem}
      onPress={() => handlePlayDownload(item, index)}
      activeOpacity={0.7}
    >
      <View style={styles.itemIcon}>
        <Ionicons
          name={getContentIcon(item.contentType)}
          size={24}
          color={isDark ? theme.colors.sleepAccent : theme.colors.primary}
        />
      </View>
      <View style={styles.itemInfo}>
        <Text style={styles.itemTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.itemMeta}>
          {item.duration_minutes} min • {formatFileSize(item.fileSize)} • {formatDate(item.downloadedAt)}
        </Text>
        {item.parentTitle && (
          <Text style={styles.itemParent} numberOfLines={1}>
            {item.parentTitle}
          </Text>
        )}
      </View>
      <TouchableOpacity
        onPress={(e) => {
          e.stopPropagation();
          handleDeleteItem(item);
        }}
        style={styles.deleteButton}
      >
        <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <LinearGradient
      colors={isDark ? theme.gradients.sleepyNight as [string, string] : [theme.colors.background, theme.colors.background]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Offline Mode Banner */}
        {isOffline && (
          <View style={styles.offlineBanner}>
            <View style={styles.offlineBannerContent}>
              <Ionicons name="cloud-offline-outline" size={18} color="#1A1A1A" />
              <Text style={styles.offlineBannerText}>You're offline</Text>
            </View>
            <TouchableOpacity 
              onPress={handleRetryConnection}
              style={styles.retryButton}
              disabled={checkingConnection}
            >
              {checkingConnection ? (
                <ActivityIndicator size="small" color="#1A1A1A" />
              ) : (
                <>
                  <Ionicons name="refresh" size={16} color="#1A1A1A" />
                  <Text style={styles.retryButtonText}>Retry</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Header */}
        <View style={styles.header}>
          {!isOffline ? (
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons
                name="chevron-back"
                size={24}
                color={isDark ? theme.colors.sleepText : theme.colors.text}
              />
            </TouchableOpacity>
          ) : (
            <View style={styles.backButton} />
          )}
          <Text style={styles.headerTitle}>
            {isOffline ? 'Offline Mode' : 'Downloads'}
          </Text>
          <TouchableOpacity
            onPress={handleDeleteAll}
            style={styles.deleteAllButton}
            disabled={downloads.length === 0}
          >
            <Text
              style={[
                styles.deleteAllText,
                downloads.length === 0 && styles.deleteAllTextDisabled,
              ]}
            >
              Delete All
            </Text>
          </TouchableOpacity>
        </View>

        {/* Storage Info */}
        <View style={styles.storageInfo}>
          <View style={styles.storageIcon}>
            <Ionicons
              name="folder-outline"
              size={24}
              color={isDark ? theme.colors.sleepAccent : theme.colors.primary}
            />
          </View>
          <View>
            <Text style={styles.storageTitle}>
              {isOffline ? 'Available Offline' : 'Storage Used'}
            </Text>
            <Text style={styles.storageValue}>
              {formatFileSize(totalSize)} • {downloads.length} item{downloads.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {/* Downloads List */}
        {downloads.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons
              name={isOffline ? 'cloud-offline-outline' : 'cloud-download-outline'}
              size={64}
              color={isDark ? theme.colors.sleepTextMuted : theme.colors.textMuted}
            />
            <Text style={styles.emptyTitle}>
              {isOffline ? 'No Offline Content' : 'No Downloads'}
            </Text>
            <Text style={styles.emptyText}>
              {isOffline 
                ? 'You have no downloaded content available for offline listening. Connect to the internet to download content.'
                : 'Download content to listen offline. Look for the download button on content pages.'
              }
            </Text>
            {isOffline && (
              <TouchableOpacity 
                onPress={handleRetryConnection}
                style={styles.retryButtonLarge}
                disabled={checkingConnection}
              >
                {checkingConnection ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Ionicons name="refresh" size={20} color="white" />
                    <Text style={styles.retryButtonLargeText}>Check Connection</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <FlatList
            data={downloads}
            keyExtractor={(item) => item.contentId}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={isDark ? theme.colors.sleepText : theme.colors.text}
              />
            }
          />
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const createStyles = (theme: Theme, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    safeArea: {
      flex: 1,
    },
    offlineBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: '#FFA726',
      paddingVertical: 10,
      paddingHorizontal: theme.spacing.md,
    },
    offlineBannerContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    offlineBannerText: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 14,
      color: '#1A1A1A',
    },
    retryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255, 255, 255, 0.3)',
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 16,
      gap: 4,
    },
    retryButtonText: {
      fontFamily: theme.fonts.ui.medium,
      fontSize: 13,
      color: '#1A1A1A',
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
      justifyContent: 'center',
      alignItems: 'flex-start',
    },
    headerTitle: {
      fontFamily: theme.fonts.display.semiBold,
      fontSize: 18,
      color: isDark ? theme.colors.sleepText : theme.colors.text,
    },
    deleteAllButton: {
      paddingVertical: 8,
      paddingHorizontal: 12,
    },
    deleteAllText: {
      fontFamily: theme.fonts.ui.medium,
      fontSize: 14,
      color: '#FF6B6B',
    },
    deleteAllTextDisabled: {
      color: isDark ? theme.colors.sleepTextMuted : theme.colors.textMuted,
    },
    storageInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? theme.colors.sleepSurface : theme.colors.surface,
      marginHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.md,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      gap: theme.spacing.md,
    },
    storageIcon: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: isDark
        ? `${theme.colors.sleepAccent}20`
        : `${theme.colors.primary}15`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    storageTitle: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 16,
      color: isDark ? theme.colors.sleepText : theme.colors.text,
    },
    storageValue: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 14,
      color: isDark ? theme.colors.sleepTextMuted : theme.colors.textMuted,
      marginTop: 2,
    },
    listContent: {
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.xl,
    },
    downloadItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? theme.colors.sleepSurface : theme.colors.surface,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.lg,
      marginBottom: theme.spacing.sm,
      gap: theme.spacing.md,
    },
    itemIcon: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: isDark
        ? `${theme.colors.sleepAccent}20`
        : `${theme.colors.primary}15`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    itemInfo: {
      flex: 1,
    },
    itemTitle: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 15,
      color: isDark ? theme.colors.sleepText : theme.colors.text,
    },
    itemMeta: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 12,
      color: isDark ? theme.colors.sleepTextMuted : theme.colors.textMuted,
      marginTop: 2,
    },
    itemParent: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 12,
      color: isDark ? theme.colors.sleepTextMuted : theme.colors.textMuted,
      marginTop: 2,
      fontStyle: 'italic',
    },
    deleteButton: {
      width: 40,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.xl,
    },
    emptyTitle: {
      fontFamily: theme.fonts.display.semiBold,
      fontSize: 20,
      color: isDark ? theme.colors.sleepText : theme.colors.text,
      marginTop: theme.spacing.lg,
    },
    emptyText: {
      fontFamily: theme.fonts.ui.regular,
      fontSize: 14,
      color: isDark ? theme.colors.sleepTextMuted : theme.colors.textMuted,
      textAlign: 'center',
      marginTop: theme.spacing.sm,
      lineHeight: 20,
    },
    retryButtonLarge: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? theme.colors.sleepAccent : theme.colors.primary,
      paddingVertical: 12,
      paddingHorizontal: 24,
      borderRadius: 24,
      marginTop: theme.spacing.lg,
      gap: 8,
    },
    retryButtonLargeText: {
      fontFamily: theme.fonts.ui.semiBold,
      fontSize: 15,
      color: 'white',
    },
  });
