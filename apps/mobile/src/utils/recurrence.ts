import dayjs, { type Dayjs, type ManipulateType } from 'dayjs';

import type { RepeatRule } from '../types/event';

const UNIT_BY_REPEAT: Record<Exclude<RepeatRule, 'none'>, ManipulateType> = {
  weekly: 'week',
  monthly: 'month',
  yearly: 'year',
};

/**
 * For a repeating event whose stored dateTimeISO is its first/original
 * occurrence, returns the next occurrence at or after `from` (default now).
 * Non-repeating events just return their own date, even if it's in the
 * past — the caller decides what "past" means for those.
 *
 * Without this, a weekly/monthly/yearly event whose original date has
 * already gone by shows a countdown of 0 instead of counting down to the
 * next real occurrence (see UI feedback: "Days" field showing 0).
 */
export function getNextOccurrence(dateTimeISO: string, repeat: RepeatRule, from: Dayjs = dayjs()): Dayjs {
  let occurrence = dayjs(dateTimeISO);
  if (repeat === 'none' || occurrence.isAfter(from)) return occurrence;

  const unit = UNIT_BY_REPEAT[repeat];
  // Jump forward in whole cycles first so we're not looping day-by-day for
  // an event that's years overdue, then step the rest one cycle at a time.
  const cyclesElapsed = Math.max(0, from.diff(occurrence, unit));
  if (cyclesElapsed > 0) occurrence = occurrence.add(cyclesElapsed, unit);
  while (occurrence.isBefore(from)) {
    occurrence = occurrence.add(1, unit);
  }
  return occurrence;
}

export function getNextOccurrenceISO(dateTimeISO: string, repeat: RepeatRule): string {
  return getNextOccurrence(dateTimeISO, repeat).toISOString();
}
