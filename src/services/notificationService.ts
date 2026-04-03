/**
 * ============================================================
 * notificationService.ts — Notification Facade
 * ============================================================
 *
 * Architectural Role:
 *   This module implements the Facade pattern to shield the rest of the app
 *   from the complexity of Expo notifications. It provides a simple, high-level
 *   API for scheduling different types of meditation-related notifications
 *   (daily reminders, session completions, streak milestones, mindful moments).
 *   Persistence (reminder ID and time) is handled via AsyncStorage, making
 *   reminders survive app restarts.
 *
 * Design Patterns:
 *   - Facade: Abstracts the Expo Notifications API behind a clean, domain-specific
 *     interface. Clients never touch Expo directly — they call scheduleDailyReminder()
 *     or scheduleStreakReminder(), not the low-level Notifications.scheduleNotificationAsync().
 *   - Singleton: notificationService is instantiated once and exported as a module-level
 *     instance, ensuring single source of truth for notification listeners.
 *   - Observer Pattern (implicit): addNotificationListener/addResponseListener allow
 *     screens and viewmodels to subscribe to notification events, reacting when users
 *     tap notifications.
 *   - Graceful Degradation: Permission checks (requestPermissions) ensure the app
 *     remains functional even if the user denies notification access — methods simply
 *     return early rather than crashing.
 *
 * Key Responsibilities:
 *   1. Initialize Expo notifications handler on instantiation (configureNotifications)
 *   2. Guard all notification scheduling with explicit permission checks
 *   3. Persist daily reminder ID and time to AsyncStorage for recovery after app restart
 *   4. Provide a simple facade for scheduling different notification types
 *   5. Manage listener subscriptions (add/remove) to prevent memory leaks
 *
 * Key Dependencies:
 *   - expo-notifications: Low-level notification scheduling
 *   - AsyncStorage: Persistent local storage for reminder state
 *   - react-native Platform: Runtime environment detection (iOS vs Android)
 *
 * Consumed By:
 *   Feature modules and viewmodels that need to schedule reminders, typically
 *   triggered by user actions (setting a daily reminder) or app state changes
 *   (meditation session completed, streak milestone reached).
 * ============================================================
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export class NotificationService {
  private notificationListener: any = null;
  private responseListener: any = null;

  constructor() {
    this.configureNotifications();
  }

  /**
   * Initialize the Expo notification handler and request permissions on iOS.
   *
   * On iOS, we must request user permission to show notifications. On Android,
   * the permission is already granted at install time (no async request needed).
   * This is a platform-specific Capability Detection pattern.
   */
  private async configureNotifications() {
    // --- Phase 1: Register the notification handler ---
    // This callback fires when a notification arrives while the app is in the foreground.
    // We configure it to show alerts, play sound, but not set a badge.
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    // --- Phase 2: Request iOS permissions ---
    // iOS requires explicit user consent to display notifications. Android doesn't.
    // This is a platform conditional check (Strategy pattern) — runtime behavior
    // diverges based on the detected OS.
    if (Platform.OS === 'ios') {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('Notification permissions not granted');
      }
    }
  }

  /**
   * Check current notification permissions and request them if not already granted.
   *
   * Uses a read-then-write pattern: first check the existing status, only request
   * if denied. This is more efficient than always requesting. Returns a boolean
   * indicating whether the app has permission to send notifications.
   *
   * @returns true if notifications are allowed, false otherwise
   */
  async requestPermissions(): Promise<boolean> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    return finalStatus === 'granted';
  }

  /**
   * Schedule a daily recurring meditation reminder at the specified hour and minute.
   *
   * This method implements several important patterns:
   * - Permission gating: Throws an error if the user has denied notification permission
   *   (a strict fail-fast approach, since daily reminders are a core feature).
   * - Idempotent replacement: Calling this again cancels the existing reminder and
   *   schedules a new one at the new time. There is always exactly one daily reminder.
   * - Persistent recovery: The reminder ID and time are saved to AsyncStorage so that
   *   if the app crashes or is force-closed, the daily reminder persists until explicitly
   *   cancelled by the user.
   *
   * @param hour - The hour (0–23) in the user's local timezone
   * @param minute - The minute (0–59)
   * @param title - Notification title shown in the notification center
   * @param body - Notification body text shown in the notification center
   * @returns The Expo notification identifier for this reminder
   * @throws Error if notification permissions are not granted
   */
  async scheduleDailyReminder(hour: number, minute: number, title: string, body: string) {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      throw new Error('Notification permissions not granted');
    }

    // --- Phase 1: Cancel existing reminder (idempotent replacement) ---
    // This ensures there's only one daily reminder at any time. If the user changes
    // their reminder time, the old one is cleaned up.
    await this.cancelDailyReminder();

    // --- Phase 2: Schedule the new daily reminder ---
    // The trigger object with hour/minute and repeats: true tells Expo to fire
    // this notification every day at the specified time in the user's local timezone.
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
        data: { type: 'daily_reminder' },
      },
      trigger: {
        hour,
        minute,
        repeats: true,
      },
    });

    // --- Phase 3: Persist reminder state to AsyncStorage ---
    // If the app crashes or is killed, the OS will still fire the notification
    // at the scheduled time, but we won't know which reminder ID to cancel later.
    // Saving the ID and time here allows us to recover the state on next app launch.
    await AsyncStorage.setItem('daily_reminder_id', identifier);
    await AsyncStorage.setItem('daily_reminder_time', `${hour}:${minute}`);

    return identifier;
  }

  /**
   * Cancel the currently active daily reminder, if one exists.
   *
   * This is safe to call even if no reminder is scheduled — it checks AsyncStorage
   * first and only attempts cancellation if an ID is found (Graceful Degradation).
   */
  async cancelDailyReminder() {
    const reminderId = await AsyncStorage.getItem('daily_reminder_id');
    if (reminderId) {
      await Notifications.cancelScheduledNotificationAsync(reminderId);
      await AsyncStorage.removeItem('daily_reminder_id');
      await AsyncStorage.removeItem('daily_reminder_time');
    }
  }

  /**
   * Retrieve the time of the currently scheduled daily reminder.
   *
   * @returns A string in the format "HH:MM" (e.g., "09:30"), or null if no daily reminder is set
   */
  async getDailyReminderTime(): Promise<string | null> {
    return await AsyncStorage.getItem('daily_reminder_time');
  }

  /**
   * Schedule an immediate congratulatory notification after a meditation session completes.
   *
   * This is a transient, one-time notification (trigger: null means send immediately).
   * It does not persist across app restarts — it's only sent if the app is running when
   * the session ends. Permission checks are soft (returns early) because this is a
   * nice-to-have feature, not core functionality.
   *
   * @param minutes - The duration of the meditation session, shown in the notification body
   * @returns The Expo notification identifier, or undefined if permissions denied
   */
  async scheduleSessionReminder(minutes: number) {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return;

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Meditation Complete! 🧘',
        body: `Great job! You meditated for ${minutes} minutes today.`,
        sound: 'default',
        data: { type: 'session_complete' },
      },
      trigger: null, // Immediate notification — send now, don't schedule for later
    });

    return identifier;
  }

  /**
   * Schedule a milestone celebration notification when the user reaches a streak milestone.
   *
   * Only sends notifications at predefined milestones (3, 7, 14, 21, 30, 50, 100 days)
   * to avoid notification fatigue. This is a Gatekeeper pattern — a single checkpoint
   * that filters out non-milestone events before notification creation.
   *
   * @param streak - The current meditation streak length in days
   * @returns The Expo notification identifier if a milestone is reached, undefined otherwise
   */
  async scheduleStreakReminder(streak: number) {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return;

    // --- Guard clause: only notify at milestones ---
    // Sending a notification for every single day would be annoying (notification fatigue).
    // This whitelist ensures we only celebrate the moments that truly matter.
    const milestones = [3, 7, 14, 21, 30, 50, 100];
    if (!milestones.includes(streak)) return;

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: `${streak} Day Streak! 🔥`,
        body: `Amazing! You've meditated for ${streak} days in a row. Keep it up!`,
        sound: 'default',
        data: { type: 'streak_milestone', streak },
      },
      trigger: null, // Immediate notification
    });

    return identifier;
  }

  /**
   * Schedule a "mindful moment" notification with a random mindfulness prompt.
   *
   * This sends a single notification at a random time between 1–3 hours from now,
   * with a randomly selected message to encourage micro-moments of reflection.
   * The randomization prevents the notification from feeling predictable or stale.
   *
   * @returns The Expo notification identifier, or undefined if permissions denied
   */
  async scheduleMindfulMoment() {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) return;

    // --- Array of mindfulness prompts ---
    // The random selection here is intentional: users see a different message each time,
    // creating variety and preventing habit adaptation (the tendency to ignore repeated
    // notifications from the same source).
    const mindfulMessages = [
      'Take a deep breath and center yourself.',
      'Notice three things you can see right now.',
      'How are you feeling in this moment?',
      'Pause and appreciate where you are.',
      'Take a moment to relax your shoulders.',
    ];

    const randomMessage = mindfulMessages[Math.floor(Math.random() * mindfulMessages.length)];

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Mindful Moment 🌸',
        body: randomMessage,
        sound: 'default',
        data: { type: 'mindful_moment' },
      },
      trigger: {
        // Randomize the delay (1–3 hours) so the notification doesn't arrive
        // at a predictable time. This is a soft form of variable interval reinforcement.
        seconds: 3600 + Math.floor(Math.random() * 7200), // Random between 1-3 hours
      },
    });

    return identifier;
  }

  /**
   * Register a listener to be invoked whenever a notification arrives while the app is in the foreground.
   *
   * This implements the Observer pattern: the listener is stored as instance state
   * and called whenever the observed Expo notification stream emits. Callers should
   * call removeListeners() during cleanup (e.g., useEffect cleanup) to prevent memory leaks.
   *
   * @param callback - Invoked with the Notification object when a notification arrives
   */
  addNotificationListener(callback: (notification: Notifications.Notification) => void) {
    this.notificationListener = Notifications.addNotificationReceivedListener(callback);
  }

  /**
   * Register a listener to be invoked when the user taps a notification.
   *
   * This allows the app to respond to user interactions with notifications — e.g.,
   * navigate to a specific screen when a streak milestone notification is tapped.
   * The callback receives the full NotificationResponse, including the notification
   * object and metadata about the user interaction.
   *
   * @param callback - Invoked with the NotificationResponse when a user taps a notification
   */
  addResponseListener(callback: (response: Notifications.NotificationResponse) => void) {
    this.responseListener = Notifications.addNotificationResponseReceivedListener(callback);
  }

  /**
   * Unregister all active notification listeners.
   *
   * This cleanup method prevents memory leaks by removing the listeners stored
   * in instance state. Call this in a useEffect cleanup function when a screen
   * unmounts, or during app shutdown.
   */
  removeListeners() {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }
}

/**
 * Module-level singleton instance of NotificationService.
 *
 * Using a singleton ensures all screens and features share the same notification
 * service instance (single source of truth for listeners and state). This is
 * imported as `notificationService` and used throughout the app.
 */
export const notificationService = new NotificationService();
