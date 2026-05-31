/**
 * ============================================================
 * features/library/hooks/useCollectionDetail.ts
 * ============================================================
 *
 * The shared state machine behind the album/series/course detail
 * screens, parameterized by a `CollectionConfig`. Extracted in Phase 5
 * Step 3 so one `CollectionDetailScreen` can drive all three content
 * types. Behavior mirrors the original three screens exactly (see
 * docs/library-screen-inventory.md):
 *
 *   1. load parent by id
 *   2. on focus: load completed child ids
 *   3. on focus: load downloaded child ids + bump refreshKey (forces
 *      DownloadButton to re-check)
 *   4. resolve a download URL per child (gates DownloadButton render)
 *   5. auto-open a child once when `autoOpenItemId` is supplied
 *
 * `handleChildPress` applies the paywall gate then navigates to the
 * child player with the type-specific params the config builds.
 * ============================================================
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { useAuth } from '../../../core/auth/AuthContext';
import { useNetwork } from '../../../core/network/NetworkContext';
import { useSubscription } from '../../../core/subscription/SubscriptionContext';
import { getAudioUrlFromPath } from '../../../core/audio/audioFiles';
import { getDownloadedContentIds } from '../../../services/downloadService';
import { getCompletedContentIds } from '../../../services/firestoreService';
import type { CollectionConfig } from '../types';

export interface UseCollectionDetailResult<TParent, TChild> {
  /** The fetched parent document, or null while loading / not found. */
  parent: TParent | null;
  /** Ordered children read out of the parent (empty until loaded). */
  children: TChild[];
  loading: boolean;
  /** Completed child ids (refetched on focus). */
  completedIds: Set<string>;
  /** Downloaded child ids (kept for parity; not rendered directly). */
  downloadedIds: Set<string>;
  /** child id → resolved download URL; gates whether DownloadButton renders. */
  audioUrls: Map<string, string>;
  /** Bumped on focus to force DownloadButton components to re-check. */
  refreshKey: number;
  isOffline: boolean;
  hasSubscription: boolean;
  showPaywall: boolean;
  openPaywall: () => void;
  closePaywall: () => void;
  /** Paywall-gate then navigate to the child's player route. */
  handleChildPress: (child: TChild, index: number) => void;
  /** Re-read downloaded ids (wired to DownloadButton.onDownloadComplete). */
  refreshDownloadedIds: () => void;
}

export function useCollectionDetail<TParent, TChild>(
  config: CollectionConfig<TParent, TChild>,
  parentId: string | undefined,
  opts?: { autoOpenItemId?: string }
): UseCollectionDetailResult<TParent, TChild> {
  const router = useRouter();
  const { user } = useAuth();
  const { isOffline } = useNetwork();
  const { isPremium: hasSubscription } = useSubscription();

  const [parent, setParent] = useState<TParent | null>(null);
  const [loading, setLoading] = useState(true);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [downloadedIds, setDownloadedIds] = useState<Set<string>>(new Set());
  const [audioUrls, setAudioUrls] = useState<Map<string, string>>(new Map());
  const [refreshKey, setRefreshKey] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);
  const hasAutoOpened = useRef(false);

  const autoOpenItemId = opts?.autoOpenItemId;
  const children = parent ? config.getChildren(parent) : [];

  // 1. Load parent by id.
  useEffect(() => {
    async function loadParent() {
      if (!parentId) return;
      setLoading(true);
      const data = await config.fetchParentById(parentId);
      setParent(data);
      setLoading(false);
    }
    loadParent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parentId]);

  // 2. Completed child ids — refetch when the screen regains focus.
  useFocusEffect(
    useCallback(() => {
      async function loadCompletedIds() {
        if (!user) return;
        const ids = await getCompletedContentIds(user.uid, config.childContentType);
        setCompletedIds(ids);
      }
      loadCompletedIds();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user])
  );

  // 3. Downloaded child ids on focus + bump refreshKey (forces DownloadButton re-check).
  useFocusEffect(
    useCallback(() => {
      async function loadDownloadedIds() {
        const ids = await getDownloadedContentIds(config.childContentType);
        setDownloadedIds(ids);
      }
      loadDownloadedIds();
      setRefreshKey((prev) => prev + 1);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  // 4. Resolve a download URL for each child.
  useEffect(() => {
    async function loadAudioUrls() {
      if (!parent) return;
      const urls = new Map<string, string>();
      for (const child of config.getChildren(parent)) {
        const url = await getAudioUrlFromPath(config.getChildAudioPath(child));
        if (url) {
          urls.set(config.getChildId(child), url);
        }
      }
      setAudioUrls(urls);
    }
    loadAudioUrls();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parent]);

  // 5. Auto-open a specific child once when autoOpenItemId is provided.
  useEffect(() => {
    if (!parent || !autoOpenItemId || hasAutoOpened.current) return;
    const list = config.getChildren(parent);
    const index = list.findIndex((c) => config.getChildId(c) === autoOpenItemId);
    if (index !== -1) {
      hasAutoOpened.current = true;
      const child = list[index];
      router.push({
        pathname: config.playerPathname as any,
        params: config.buildPlayerParams(parent, child, index),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parent, autoOpenItemId]);

  const handleChildPress = useCallback(
    (child: TChild, index: number) => {
      if (parent == null) return;
      // Paywall gate: locked (non-free) children require a subscription.
      if (!config.getChildIsFree(child) && !hasSubscription) {
        setShowPaywall(true);
        return;
      }
      router.push({
        pathname: config.playerPathname as any,
        params: config.buildPlayerParams(parent, child, index),
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [parent, hasSubscription]
  );

  const refreshDownloadedIds = useCallback(() => {
    getDownloadedContentIds(config.childContentType).then(setDownloadedIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openPaywall = useCallback(() => setShowPaywall(true), []);
  const closePaywall = useCallback(() => setShowPaywall(false), []);

  return {
    parent,
    children,
    loading,
    completedIds,
    downloadedIds,
    audioUrls,
    refreshKey,
    isOffline,
    hasSubscription,
    showPaywall,
    openPaywall,
    closePaywall,
    handleChildPress,
    refreshDownloadedIds,
  };
}
