import dayjs from 'dayjs';

import type { CalendarSystem } from '../storage/preferences';
import type { RepeatRule } from '../types/event';
import { formatCivilDateFull, formatCivilDateMonthDay } from './calendars';

// Hero card date line, format depends on how the event repeats — a
// non-repeating event needs the year to be meaningful; a yearly/monthly
// repeat happens on the same day+month (or day) every cycle so the year is
// noise; a weekly repeat is easiest to read by weekday. Time is always
// shown last as HH:mm. See UI feedback for the exact per-repeat rules.
// The day/month/year themselves follow the user's chosen calendar system
// (Gregorian/Persian/Islamic) — see src/utils/calendars.ts.
export function formatEventDateLine(dateTimeISO: string, repeat: RepeatRule, calendar: CalendarSystem): string {
  const time = dayjs(dateTimeISO).format('HH:mm');

  switch (repeat) {
    case 'weekly':
      return `${dayjs(dateTimeISO).format('ddd')}, ${formatCivilDateMonthDay(dateTimeISO, calendar)} · ${time}`;
    case 'monthly':
    case 'yearly':
      return `${formatCivilDateMonthDay(dateTimeISO, calendar)} · ${time}`;
    case 'none':
    default:
      return `${formatCivilDateFull(dateTimeISO, calendar)} · ${time}`;
  }
}
