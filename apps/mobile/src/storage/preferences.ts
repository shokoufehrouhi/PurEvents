import AsyncStorage from '@react-native-async-storage/async-storage';

export type AppearanceMode = 'system' | 'light' | 'dark';
export type CalendarSystem = 'gregorian' | 'persian' | 'islamic';
export type TimeFormat = '12h' | '24h';

export interface Preferences {
  appearance: AppearanceMode;
  // NOTE: only 'gregorian' actually renders differently today. Persian/Islamic
  // conversion (e.g. via jalaali-js / a hijri library) is a follow-up — this
  // setting is stored and surfaced in UI ahead of that work landing.
  calendar: CalendarSystem;
  timeFormat: TimeFormat;
  firstDayOfWeek: 0 | 1 | 6; // 0 = Sunday, 1 = Monday, 6 = Saturday (dayjs convention)
  notificationsEnabled: boolean;
  soundsHapticsEnabled: boolean;
  autoTimezone: boolean;
  manualTimezone?: string;
  /** Minutes-before-event offsets applied to new events by default. */
  defaultReminderOffsets: number[];
}

export const DEFAULT_PREFERENCES: Preferences = {
  appearance: 'system',
  calendar: 'gregorian',
  timeFormat: '24h',
  firstDayOfWeek: 1,
  notificationsEnabled: true,
  soundsHapticsEnabled: true,
  autoTimezone: true,
  defaultReminderOffsets: [1440], // 1 day before
};

const STORAGE_KEY = 'purevents:preferences';

export async function loadPreferences(): Promise<Preferences> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return DEFAULT_PREFERENCES;
  try {
    return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export async function savePreferences(prefs: Preferences): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}
