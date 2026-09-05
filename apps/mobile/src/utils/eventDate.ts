import dayjs from 'dayjs';

import type { RepeatRule } from '../types/event';

// Hero card date line, format depends on how the event repeats — a
// non-repeating event needs the year to be meaningful; a yearly/monthly
// repeat happens on the same day+month (or day) every cycle so the year is
// noise; a weekly repeat is easiest to read by weekday. Time is always
// shown last as HH:mm. See UI feedback for the exact per-repeat rules.
export function formatEventDateLine(dateTimeISO: string, repeat: RepeatRule): string {
  const d = dayjs(dateTimeISO);
  const time = d.format('HH:mm');

  switch (repeat) {
    case 'weekly':
      return `${d.format('ddd, D MMM')} · ${time}`;
    case 'monthly':
    case 'yearly':
      return `${d.format('D MMM')} · ${time}`;
    case 'none':
    default:
      return `${d.format('D MMM YYYY')} · ${time}`;
  }
}
