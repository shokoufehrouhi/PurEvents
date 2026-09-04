export type EventCategory = 'personal' | 'work' | 'travel' | 'finance' | 'health' | 'other';

export type RepeatRule = 'none' | 'yearly' | 'monthly' | 'weekly';

export interface PurEvent {
  id: string;
  title: string;
  /** ISO 8601 UTC instant the event occurs at. */
  dateTimeISO: string;
  /** IANA timezone name the event was created/entered in (for display only in MVP). */
  timezone: string;
  category: EventCategory;
  note?: string;
  repeat: RepeatRule;
  createdAt: string;
  updatedAt: string;
}

export type NewEventInput = Omit<PurEvent, 'id' | 'createdAt' | 'updatedAt'>;
