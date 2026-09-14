import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { logNotificationFired, markNotificationSeen } from '../storage/notificationLog';
import type { NotificationSoundKey, PurEvent } from '../types/event';
import { getActiveReminders } from '../utils/reminders';

// Filenames as bundled via the expo-notifications config plugin's own
// `sounds` list in app.json — that plugin copies each one into the iOS app
// bundle and Android's res/raw (by basename) at prebuild time, so these
// strings must match exactly. 'default'/unset isn't listed here; those
// cases pass `sound: true` (OS default) straight through instead.
export const NOTIFICATION_SOUND_FILES: Record<Exclude<NotificationSoundKey, 'default'>, string> = {
  chime: 'chime.wav',
  bell: 'bell.wav',
  ping: 'ping.wav',
  pulse: 'pulse.wav',
};

// Android 8+ ignores a per-notification sound entirely — the *channel* a
// notification is posted to controls it instead, and a channel's sound
// can't be changed after creation (Android OS limitation, see
// setNotificationChannelAsync's own doc comment). So: one fixed, never-
// mutated channel per sound key, created (idempotently) the first time
// it's needed, and referenced by trigger.channelId below. iOS has no
// concept of channels — content.sound alone is enough there.
const ensuredChannels = new Set<string>();

function channelIdFor(sound: Exclude<NotificationSoundKey, 'default'>): string {
  return `puraevents-${sound}`;
}

async function ensureAndroidChannel(sound: Exclude<NotificationSoundKey, 'default'>): Promise<string> {
  const channelId = channelIdFor(sound);
  if (Platform.OS === 'android' && !ensuredChannels.has(channelId)) {
    // Resource name, not the filename — Android's raw resources are
    // referenced without their extension (see the config plugin's own
    // ANDROID_RES_PATH/raw copy step).
    await Notifications.setNotificationChannelAsync(channelId, {
      name: `${sound.charAt(0).toUpperCase()}${sound.slice(1)} reminders`,
      importance: Notifications.AndroidImportance.HIGH,
      sound,
    });
    ensuredChannels.add(channelId);
  }
  return channelId;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

function logFromNotification(notification: Notifications.Notification): void {
  const data = notification.request.content.data as { eventId?: string } | undefined;
  logNotificationFired({
    id: notification.request.identifier,
    eventId: data?.eventId ?? '',
    title: notification.request.content.title ?? '',
    body: notification.request.content.body ?? '',
    firedAt: new Date(notification.date).toISOString(),
  });
}

// Called once from app/_layout.tsx — expo-notifications keeps no history of
// its own once a notification leaves the OS tray, so this is what actually
// builds the log app/notification-history.tsx reads:
//  - a live "received" event (app process alive when it fires) gets logged
//    immediately, unseen.
//  - opening/tapping the notification marks that same entry seen.
//  - on top of both, a one-time reconciliation pass against whatever's
//    still sitting in the OS tray right now catches anything that fired
//    while the app was fully closed and neither listener could run —
//    logNotificationFired's own id-dedupe means this never double-logs
//    one the received-listener already caught.
export function initNotificationLogListeners(): () => void {
  const receivedSub = Notifications.addNotificationReceivedListener(logFromNotification);
  const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
    markNotificationSeen(response.notification.request.identifier);
  });

  Notifications.getPresentedNotificationsAsync().then((presented) => {
    presented.forEach(logFromNotification);
  });

  return () => {
    receivedSub.remove();
    responseSub.remove();
  };
}

// Pre-rename (PurEvents -> PuraEvents) identifiers still floating around in
// already-scheduled notifications use the old prefix — cancelRemindersForEvent
// matches both so they still get cleaned up instead of becoming orphaned.
const LEGACY_PREFIX = 'purevents';

function identifierFor(eventId: string, offsetMin: number): string {
  return `puraevents:${eventId}:${offsetMin}`;
}

export async function cancelRemindersForEvent(eventId: string): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const toCancel = scheduled.filter(
    (n) => n.identifier.startsWith(`puraevents:${eventId}:`) || n.identifier.startsWith(`${LEGACY_PREFIX}:${eventId}:`)
  );
  await Promise.all(toCancel.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
}

// isPro is required, not optional — on free plan only FREE_LIMITS.
// freeReminderOffset ("1 day before") actually gets scheduled, same offsets
// the detail screen shows as active (see getActiveReminders); the rest stay
// in event.reminders untouched so they come back the moment Pro does.
export async function scheduleRemindersForEvent(
  event: Pick<PurEvent, 'id' | 'title' | 'dateTimeISO' | 'reminders' | 'note' | 'notificationSound'>,
  isPro: boolean
): Promise<void> {
  await cancelRemindersForEvent(event.id);

  const eventTime = new Date(event.dateTimeISO).getTime();
  const now = Date.now();
  const activeReminders = getActiveReminders(event.reminders, isPro);

  const sound = event.notificationSound;
  const isCustomSound = sound && sound !== 'default';
  // Android-only — ensures the fixed per-sound channel exists (creating it
  // the first time, no-op after) before anything tries to schedule into
  // it. Skipped entirely for 'default'/unset (uses the OS default channel/
  // sound instead, see content.sound below).
  const channelId = isCustomSound ? await ensureAndroidChannel(sound) : undefined;

  for (const offsetMin of activeReminders) {
    const fireAt = eventTime - offsetMin * 60_000;
    if (fireAt <= now) continue; // don't schedule reminders in the past

    // Always auto-generated, never manually typed — title is just the
    // event's own name, and the body leads with the note (when there is
    // one) followed by how much time is actually left, so a reminder
    // reads like "Don't forget the passport — coming up in 2h" instead of
    // needing the user to retype that same info as a separate message.
    const timeLine = offsetMin === 0 ? "It's happening now!" : `Coming up in ${describeOffset(offsetMin)}`;
    const body = event.note?.trim() ? `${event.note.trim()} — ${timeLine}` : timeLine;

    await Notifications.scheduleNotificationAsync({
      identifier: identifierFor(event.id, offsetMin),
      content: {
        title: event.title,
        body,
        data: { eventId: event.id },
        // Filename (with extension) on iOS / pre-8 Android; the fixed
        // channel above is what actually controls it on Android 8+ (see
        // ensureAndroidChannel's own comment).
        sound: isCustomSound ? NOTIFICATION_SOUND_FILES[sound] : true,
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(fireAt), channelId },
    });
  }
}

function describeOffset(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
  return `${Math.round(minutes / 1440)}d`;
}
