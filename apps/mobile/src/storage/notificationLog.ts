import AsyncStorage from '@react-native-async-storage/async-storage';

// A local record of every reminder notification that has actually fired —
// expo-notifications itself has no history API once a notification leaves
// the OS tray (getPresentedNotificationsAsync only covers what's still
// there), so this is our own ledger, written to as notifications arrive
// (see src/notifications/index.ts's listeners) and read by
// app/notification-history.tsx.
const STORAGE_KEY = 'puraevents:notificationLog';
// Unbounded growth isn't useful here (nobody needs a year of "coming up in
// 1h" entries) — kept newest-first, so this just truncates the tail.
const MAX_ENTRIES = 200;

export interface NotificationLogEntry {
  /** Same identifier scheduleNotificationAsync used — doubles as the
   *  dedupe key so a notification never gets logged twice. */
  id: string;
  eventId: string;
  title: string;
  body: string;
  /** ISO instant the notification actually fired (not when it was
   *  scheduled). */
  firedAt: string;
  /** False until the user opens notification-history.tsx (see
   *  markAllSeen) or taps the notification itself (see
   *  addNotificationResponseReceivedListener in notifications/index.ts). */
  seen: boolean;
}

async function readAll(): Promise<NotificationLogEntry[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as NotificationLogEntry[];
  } catch {
    return [];
  }
}

async function writeAll(entries: NotificationLogEntry[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)));
}

export async function listNotificationLog(): Promise<NotificationLogEntry[]> {
  return readAll();
}

export async function unseenNotificationCount(): Promise<number> {
  return (await readAll()).filter((e) => !e.seen).length;
}

// Called from the received-listener (a live fire) and from the app-launch/
// foreground reconciliation pass (still-presented notifications that fired
// while nothing was listening, e.g. app fully closed) — either way, a
// duplicate `id` (same notification) is a no-op rather than a second row.
export async function logNotificationFired(entry: Omit<NotificationLogEntry, 'seen'>): Promise<void> {
  const all = await readAll();
  if (all.some((e) => e.id === entry.id)) return;
  await writeAll([{ ...entry, seen: false }, ...all]);
}

export async function markNotificationSeen(id: string): Promise<void> {
  const all = await readAll();
  const index = all.findIndex((e) => e.id === id);
  if (index === -1 || all[index].seen) return;
  all[index] = { ...all[index], seen: true };
  await writeAll(all);
}

export async function markAllNotificationsSeen(): Promise<void> {
  const all = await readAll();
  if (all.every((e) => e.seen)) return;
  await writeAll(all.map((e) => ({ ...e, seen: true })));
}
