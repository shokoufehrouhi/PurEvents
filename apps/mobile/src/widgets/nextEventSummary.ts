import dayjs from 'dayjs';

import { listEvents } from '../storage/events';
import { accents } from '../theme/tokens';
import { getNextOccurrence } from '../utils/recurrence';

// What the actual home-screen widget (WidgetKit on iOS, react-native-
// android-widget on Android) needs to render — a plain, JSON-serializable
// snapshot, not a full PurEvent. iOS's own widget extension is a totally
// separate process with no access to this app's storage at all, so this
// same shape gets written to the shared App Group (see iosWidgetSync.ts);
// Android's headless widget task runs inside this app's own JS, so it can
// just call this function directly (see androidWidgetTask.ts).
export interface NextEventSummary {
  title: string;
  /** Next occurrence, already resolved for a repeating event — the widget
   *  itself never needs to know about RepeatRule. */
  nextOccurrenceISO: string;
  /** Matches accents' own literal hex strings (see theme/tokens.ts) — typed
   *  as a template literal, not plain `string`, so it satisfies Android
   *  widget style props (ColorProp) requiring a `#`-prefixed hex directly. */
  accentHex: `#${string}`;
}

// Same "soonest upcoming" definition as the Events tab's own Upcoming list
// (app/(tabs)/index.tsx) — a repeating event's next occurrence is always
// upcoming by definition, only a one-time event can be past.
export async function getNextEventSummary(): Promise<NextEventSummary | null> {
  const events = await listEvents();
  const now = dayjs();

  let nearest: { title: string; accentHex: `#${string}`; next: dayjs.Dayjs } | null = null;
  for (const event of events) {
    const next = getNextOccurrence(event.dateTimeISO, event.repeat, now);
    if (event.repeat === 'none' && !next.isAfter(now)) continue;
    if (!nearest || next.isBefore(nearest.next)) {
      nearest = { title: event.title, accentHex: accents[event.accentColor] ?? accents.violet, next };
    }
  }

  if (!nearest) return null;
  return { title: nearest.title, nextOccurrenceISO: nearest.next.toISOString(), accentHex: nearest.accentHex };
}
