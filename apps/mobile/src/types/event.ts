import type { AccentKey } from '../theme/tokens';

export type EventCategory = 'personal' | 'work' | 'travel' | 'finance' | 'health' | 'other';

export type RepeatRule = 'none' | 'yearly' | 'monthly' | 'weekly';

export interface PurEvent {
  id: string;
  title: string;
  /** ISO 8601 UTC instant the event occurs at. */
  dateTimeISO: string;
  /** IANA timezone name the event was created/entered in (for display only in MVP). */
  timezone: string;
  /** Also drives the icon shown on the hero card / list row / detail header — see src/theme/icons.ts. */
  category: EventCategory;
  accentColor: AccentKey;
  note?: string;
  repeat: RepeatRule;
  /** Minutes-before-event offsets; [0] = "at time of event". */
  reminders: number[];
  createdAt: string;
  updatedAt: string;
}

export type NewEventInput = Omit<PurEvent, 'id' | 'createdAt' | 'updatedAt'>;
