import * as Notifications from 'expo-notifications';

import type { PurEvent } from '../types/event';

// Reminder offsets in minutes-before-event. MVP default is a single
// at-the-moment reminder ([0]); the Free/Pro reminder-count limit from
// docs/PROJECT.md §6.1/6.2 (1 vs unlimited) is a business-logic gate to add
// once subscription state (RevenueCat) exists — this layer itself supports
// any number of offsets already.
export const DEFAULT_REMINDER_OFFSETS_MIN = [0];

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

function identifierFor(eventId: string, offsetMin: number): string {
  return `purevents:${eventId}:${offsetMin}`;
}

export async function cancelRemindersForEvent(eventId: string): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const toCancel = scheduled.filter((n) => n.identifier.startsWith(`purevents:${eventId}:`));
  await Promise.all(toCancel.map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
}

export async function scheduleRemindersForEvent(
  event: Pick<PurEvent, 'id' | 'title' | 'dateTimeISO'>,
  offsetsMin: number[] = DEFAULT_REMINDER_OFFSETS_MIN
): Promise<void> {
  await cancelRemindersForEvent(event.id);

  const eventTime = new Date(event.dateTimeISO).getTime();
  const now = Date.now();

  for (const offsetMin of offsetsMin) {
    const fireAt = eventTime - offsetMin * 60_000;
    if (fireAt <= now) continue; // don't schedule reminders in the past

    await Notifications.scheduleNotificationAsync({
      identifier: identifierFor(event.id, offsetMin),
      content: {
        title: event.title,
        body: offsetMin === 0 ? "It's happening now!" : `Coming up in ${describeOffset(offsetMin)}`,
        data: { eventId: event.id },
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(fireAt) },
    });
  }
}

function describeOffset(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  if (minutes < 1440) return `${Math.round(minutes / 60)}h`;
  return `${Math.round(minutes / 1440)}d`;
}
