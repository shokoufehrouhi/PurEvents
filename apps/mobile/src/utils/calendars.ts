import dayjs from 'dayjs';
import { toJalaali } from 'jalaali-js';

import type { CalendarSystem } from '../storage/preferences';

export const PERSIAN_MONTHS = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

export const ISLAMIC_MONTHS = [
  'محرم',
  'صفر',
  'ربیع‌الاول',
  'ربیع‌الثانی',
  'جمادی‌الاول',
  'جمادی‌الثانی',
  'رجب',
  'شعبان',
  'رمضان',
  'شوال',
  'ذوالقعده',
  'ذوالحجه',
];

/**
 * Gregorian -> Hijri via the tabular ("Kuwaiti algorithm") civil Islamic
 * calendar — the same arithmetic conversion used by most non-religious
 * apps. It's an approximation: real Hijri dates follow lunar sighting and
 * can be off by a day from this in either direction. Good enough for a
 * countdown app's calendar *display* preference; not for religious
 * observance.
 */
export function toHijri(date: Date): { year: number; month: number; day: number } {
  const gy = date.getFullYear();
  const gm = date.getMonth() + 1;
  const gd = date.getDate();

  const jd =
    Math.floor((1461 * (gy + 4800 + Math.floor((gm - 14) / 12))) / 4) +
    Math.floor((367 * (gm - 2 - 12 * Math.floor((gm - 14) / 12))) / 12) -
    Math.floor((3 * Math.floor((gy + 4900 + Math.floor((gm - 14) / 12)) / 100)) / 4) +
    gd -
    32075;

  let l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  l = l - 10631 * n + 354;
  const j = Math.floor((10985 - l) / 5316) * Math.floor((50 * l) / 17719) + Math.floor(l / 5670) * Math.floor((43 * l) / 15238);
  l = l - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const month = Math.floor((24 * l) / 709);
  const day = l - Math.floor((709 * month) / 24);
  const year = 30 * n + j - 30;

  return { year, month, day };
}

interface CivilDate {
  year: number;
  month: number; // 1-indexed
  day: number;
  monthName: string;
}

function toCivilDate(iso: string, calendar: CalendarSystem): CivilDate {
  const date = dayjs(iso).toDate();

  if (calendar === 'persian') {
    const { jy, jm, jd } = toJalaali(date);
    return { year: jy, month: jm, day: jd, monthName: PERSIAN_MONTHS[jm - 1] };
  }

  if (calendar === 'islamic') {
    const { year, month, day } = toHijri(date);
    return { year, month, day, monthName: ISLAMIC_MONTHS[month - 1] };
  }

  const d = dayjs(iso);
  return { year: d.year(), month: d.month() + 1, day: d.date(), monthName: d.format('MMM') };
}

// Unicode "right-to-left isolate" (U+2067 ... U+2069) around JUST the month
// name: without it, the Persian/Arabic month name's RTL direction "leaks"
// into the neutral spaces around it, and the bidi algorithm ends up
// swapping it with an adjacent number (e.g. "19 شهریور 1405" rendering as
// "19 1405 شهریور") — see UI feedback. Isolating only the RTL word (rather
// than the whole string) keeps the surrounding numbers in plain
// left-to-right order without needing to fight the bidi algorithm over the
// numbers too.
const RLI = '⁧';
const PDI = '⁩';
export function isolateRTL(s: string): string {
  return `${RLI}${s}${PDI}`;
}

/** Persian weekday initials, indexed by JS `Date#getDay()` (0=Sun .. 6=Sat). */
export const PERSIAN_WEEKDAYS_BY_JS_DAY = ['ی', 'د', 'س', 'چ', 'پ', 'ج', 'ش'];

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/** "10" -> "۱۰" — for numbers displayed as part of a Persian-calendar date. */
export function toPersianDigits(value: string | number): string {
  return String(value).replace(/[0-9]/g, (d) => PERSIAN_DIGITS[Number(d)]);
}

/** "۱۰" -> "10" — accepts Persian-Indic digits typed into a text field, strips anything else. */
export function fromPersianDigits(value: string): string {
  return value.replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d))).replace(/[^0-9]/g, '');
}

/** "10 Sep 2026" / "۱۹ شهریور ۱۴۰۵" / "27 صفر 1448" */
export function formatCivilDateFull(iso: string, calendar: CalendarSystem): string {
  const { day, monthName, year } = toCivilDate(iso, calendar);
  if (calendar === 'gregorian') return `${monthName} ${day}, ${year}`;
  const dayStr = calendar === 'persian' ? toPersianDigits(day) : String(day);
  const yearStr = calendar === 'persian' ? toPersianDigits(year) : String(year);
  return `${dayStr} ${isolateRTL(monthName)} ${yearStr}`;
}

/** "Sep 10" / "۱۹ شهریور" / "27 صفر" — for repeats where the year is noise. */
export function formatCivilDateMonthDay(iso: string, calendar: CalendarSystem): string {
  const { day, monthName } = toCivilDate(iso, calendar);
  if (calendar === 'gregorian') return `${monthName} ${day}`;
  const dayStr = calendar === 'persian' ? toPersianDigits(day) : String(day);
  return `${dayStr} ${isolateRTL(monthName)}`;
}

/** Bare day-of-month number in the target calendar, e.g. for "every month on the 16th". */
export function civilDayOfMonth(iso: string, calendar: CalendarSystem): number {
  return toCivilDate(iso, calendar).day;
}
