import umalqura from '@umalqura/core';
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
 * Gregorian <-> Hijri via @umalqura/core (the real Umm al-Qura calendar,
 * not an arithmetic approximation) — exact and round-trip verified across a
 * 10-year span in both directions. Replaced an earlier hand-rolled tabular
 * ("Kuwaiti algorithm") conversion that was forward-only and ~1-2 days off
 * official Umm al-Qura; two attempts at hand-deriving its inverse both
 * failed with a consistent ~2-day round-trip error, so this uses a tested
 * library instead, same reasoning as jalaali-js for the Persian calendar.
 * Valid range: Hijri 1318-1500 (~Gregorian 1900-2077) — ample for a
 * countdown app.
 */
export function toHijri(date: Date): { year: number; month: number; day: number } {
  const h = umalqura(date);
  return { year: h.hy, month: h.hm, day: h.hd };
}

/** Hijri (year, month 1-indexed, day) + time-of-day -> Gregorian Date. */
export function hijriToDateObject(hy: number, hm: number, hd: number, hour = 0, minute = 0, second = 0): Date {
  return umalqura(hy, hm, hd, hour, minute, second).date;
}

/** Number of days in a given Hijri month (29 or 30, per Umm al-Qura). */
export function islamicMonthLength(hy: number, hm: number): number {
  return umalqura(hy, hm, 1).daysInMonth;
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

/** Arabic weekday initials (الأحد..السبت), indexed by JS `Date#getDay()` (0=Sun .. 6=Sat). */
export const ARABIC_WEEKDAYS_BY_JS_DAY = ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'];

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

/** "10" -> "۱۰" — for numbers displayed as part of a Persian-calendar date. */
export function toPersianDigits(value: string | number): string {
  return String(value).replace(/[0-9]/g, (d) => PERSIAN_DIGITS[Number(d)]);
}

/** "۱۰" -> "10" — accepts Persian-Indic digits typed into a text field, strips anything else. */
export function fromPersianDigits(value: string): string {
  return value.replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d))).replace(/[^0-9]/g, '');
}

/**
 * Whether Persian/Islamic-calendar dates should render Farsi digits
 * (۱۴۰۵) instead of Latin ones (1405) — tied to the UI *language*, not the
 * calendar system: a Shamsi or Hijri date read in English still uses Latin
 * digits, but reads Farsi digits when the app language is Farsi or Arabic.
 */
export function shouldUseFarsiDigits(language: string): boolean {
  return language === 'fa' || language === 'ar';
}

/** "10 Sep 2026" / "۱۹ شهریور ۱۴۰۵" / "۲۷ صفر ۱۴۴۸" */
export function formatCivilDateFull(iso: string, calendar: CalendarSystem, useFarsiDigits: boolean): string {
  const { day, monthName, year } = toCivilDate(iso, calendar);
  if (calendar === 'gregorian') return `${monthName} ${day}, ${year}`;
  const dayStr = useFarsiDigits ? toPersianDigits(day) : String(day);
  const yearStr = useFarsiDigits ? toPersianDigits(year) : String(year);
  return `${dayStr} ${isolateRTL(monthName)} ${yearStr}`;
}

/** "Sep 10" / "۱۹ شهریور" / "۲۷ صفر" — for repeats where the year is noise. */
export function formatCivilDateMonthDay(iso: string, calendar: CalendarSystem, useFarsiDigits: boolean): string {
  const { day, monthName } = toCivilDate(iso, calendar);
  if (calendar === 'gregorian') return `${monthName} ${day}`;
  const dayStr = useFarsiDigits ? toPersianDigits(day) : String(day);
  return `${dayStr} ${isolateRTL(monthName)}`;
}

/** Bare day-of-month number in the target calendar, e.g. for "every month on the 16th". */
export function civilDayOfMonth(iso: string, calendar: CalendarSystem): number {
  return toCivilDate(iso, calendar).day;
}
