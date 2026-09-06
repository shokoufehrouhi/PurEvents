import { Ionicons } from '@expo/vector-icons';
import { jalaaliMonthLength, jalaaliToDateObject, toJalaali } from 'jalaali-js';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { I18nManager, Image, Modal, Pressable, StyleSheet, Text, TextInput, View, type ImageSourcePropType } from 'react-native';

import { usePreferences, useTheme } from '../theme/PreferencesContext';
import {
  ARABIC_WEEKDAYS_BY_JS_DAY,
  fromPersianDigits,
  GREGORIAN_MONTHS_BY_LANGUAGE,
  GREGORIAN_WEEKDAYS_BY_LANGUAGE,
  hijriToDateObject,
  islamicMonthLength,
  ISLAMIC_MONTHS,
  PERSIAN_MONTHS,
  PERSIAN_WEEKDAYS_BY_JS_DAY,
  toHijri,
  toPersianDigits,
} from '../utils/calendars';
import type { CalendarSystem } from '../storage/preferences';

interface Props {
  calendar: CalendarSystem;
  value: Date;
  onChange: (date: Date) => void;
  // Farsi digits (۱۴۰۵) vs. Latin (1405) — tied to the UI language, not to
  // which calendar this is (see calendars.ts shouldUseFarsiDigits): an
  // English-language user still reads 1405/1448/2026.
  useFarsiDigits: boolean;
}

interface MonthMeta {
  // Exactly one of `icon` / `image` is set.
  icon?: string;
  // When set, `icon` is an Ionicons glyph name drawn in `iconColor` instead
  // of an emoji glyph.
  iconIsVector?: boolean;
  iconColor?: string;
  // Small badge layered on the icon's top-right corner (e.g. a crescent
  // moon base with a leaf/star/sparkle accent) — only used alongside
  // `icon`, not `image`.
  accent?: string;
  // A pre-composed icon asset (e.g. cropped straight from the approved
  // mockup) — takes priority over `icon`/`accent` when set. Used for
  // Islamic's month icons: the mockup's crescent is a genuine gradient
  // graphic no emoji/vector-icon substitute reproduced convincingly.
  image?: ImageSourcePropType;
  bg: string;
}

interface CalendarAdapter {
  monthNames: string[];
  monthMeta: MonthMeta[];
  weekdayLabels: string[];
  sheetTitle: string;
  // Present only for calendars whose month-sheet mockup includes a bottom
  // "Done" button (currently just Islamic) — tapping a month already
  // selects and closes the sheet, so this is an optional extra affordance,
  // not required to confirm a choice.
  doneLabel?: string;
  // The Persian/Shamsi and Islamic/Hijri calendars are conventionally read
  // right-to-left regardless of the device's system language (month 1 at
  // the right of the month grid, first weekday at the right); Gregorian
  // reads left-to-right everywhere it's used. This is a property of the
  // calendar, not of the current UI language.
  rtl: boolean;
  toCivil: (date: Date) => { year: number; month: number; day: number };
  toDate: (year: number, month: number, day: number, hour: number, minute: number, second: number) => Date;
  monthLength: (year: number, month: number) => number;
}

// Icon + pastel chip background per Jalali month (index 0 = Farvardin),
// matching the seasonal iconography of a physical Persian calendar/planner —
// spring flowers, summer fruit/sun, autumn leaves, winter snow, and the
// Nowruz goldfish for Esfand.
const PERSIAN_MONTH_META: MonthMeta[] = [
  { icon: '🌸', bg: '#FCE4EC' },
  { icon: '🌱', bg: '#E8F5E9' },
  { icon: '☀️', bg: '#FFF8E1' },
  { icon: '☂️', bg: '#E3F2FD' },
  { icon: '🍉', bg: '#FFEBEE' },
  { icon: '🍇', bg: '#F3E5F5' },
  { icon: '🍁', bg: '#FFE0B2' },
  { icon: '🍂', bg: '#F1F8E9' },
  { icon: '❄️', bg: '#E1F5FE' },
  { icon: '🧣', bg: '#EDE7F6' },
  { icon: '⛄', bg: '#ECEFF1' },
  { icon: '🐟', bg: '#E0F7FA' },
];

// Icon + pastel chip background per Hijri month (index 0 = Muharram) —
// icons are cropped directly from the approved mockup's reference panel
// (not emoji/vector approximations: the mockup's crescent is a genuine
// gradient graphic, and its accent badges are specific colors/shapes no
// emoji reliably reproduces — e.g. the built-in 🌙 emoji is a fixed
// realistic yellow, not the mockup's periwinkle-purple). Cropped, chroma-
// keyed to transparent PNGs at apps/mobile/assets/icons/islamic-months/.
const ISLAMIC_MONTH_META: MonthMeta[] = [
  { image: require('../../assets/icons/islamic-months/muharram.png'), bg: '#EDE7F6' },
  { image: require('../../assets/icons/islamic-months/safar.png'), bg: '#E0F2F1' },
  { image: require('../../assets/icons/islamic-months/rabi-al-awwal.png'), bg: '#E8F5E9' }, // Mawlid
  { image: require('../../assets/icons/islamic-months/rabi-al-thani.png'), bg: '#F1F8E9' },
  { image: require('../../assets/icons/islamic-months/jumada-al-awwal.png'), bg: '#FFF8E1' },
  { image: require('../../assets/icons/islamic-months/jumada-al-thani.png'), bg: '#E3F2FD' },
  { image: require('../../assets/icons/islamic-months/rajab.png'), bg: '#FCE4EC' }, // Isra & Mi'raj
  { image: require('../../assets/icons/islamic-months/shaban.png'), bg: '#F3E5F5' },
  { image: require('../../assets/icons/islamic-months/ramadan.png'), bg: '#FFECB3' },
  { image: require('../../assets/icons/islamic-months/shawwal.png'), bg: '#FCE4EC' }, // Eid al-Fitr
  { image: require('../../assets/icons/islamic-months/dhu-al-qidah.png'), bg: '#EFEBE9' },
  { image: require('../../assets/icons/islamic-months/dhu-al-hijjah.png'), bg: '#FFE0B2' }, // Hajj / Eid al-Adha
];

// Icon + pastel chip background per Gregorian month (index 0 = January),
// Northern-hemisphere seasonal/secular-holiday iconography — same spirit
// as the Persian set, just for the calendar most of the app's other UI
// already assumes.
const GREGORIAN_MONTH_META: MonthMeta[] = [
  { icon: '❄️', bg: '#E1F5FE' }, // Jan
  { icon: '❄️', bg: '#E3F2FD' }, // Feb
  { icon: '🌱', bg: '#E8F5E9' }, // Mar
  { icon: '🌸', bg: '#FCE4EC' }, // Apr
  { icon: '🌷', bg: '#F3E5F5' }, // May
  { icon: '☀️', bg: '#FFF8E1' }, // Jun
  { icon: '☀️', bg: '#FFE0B2' }, // Jul
  { icon: '🌻', bg: '#FFF3E0' }, // Aug
  { icon: '🍂', bg: '#F1F8E9' }, // Sep
  { icon: '🎃', bg: '#FFE0B2' }, // Oct
  { icon: '🍁', bg: '#EFEBE9' }, // Nov
  { icon: '🎄', bg: '#FFECB3' }, // Dec
];

function gregorianMonthLength(year: number, month1: number): number {
  return new Date(year, month1, 0).getDate();
}

export function CivilCalendarPicker({ calendar, value, onChange, useFarsiDigits }: Props) {
  const { colors, radius, spacing, typography } = useTheme();
  const { prefs } = usePreferences();
  const { t, i18n } = useTranslation();

  const adapters: Record<CalendarSystem, CalendarAdapter> = {
    persian: {
      monthNames: PERSIAN_MONTHS,
      monthMeta: PERSIAN_MONTH_META,
      weekdayLabels: PERSIAN_WEEKDAYS_BY_JS_DAY,
      sheetTitle: 'انتخاب ماه',
      rtl: true,
      toCivil: (date) => {
        const { jy, jm, jd } = toJalaali(date);
        return { year: jy, month: jm, day: jd };
      },
      toDate: (year, month, day, hour, minute, second) => jalaaliToDateObject(year, month, day, hour, minute, second),
      monthLength: (year, month) => jalaaliMonthLength(year, month),
    },
    islamic: {
      monthNames: ISLAMIC_MONTHS,
      monthMeta: ISLAMIC_MONTH_META,
      weekdayLabels: ARABIC_WEEKDAYS_BY_JS_DAY,
      sheetTitle: 'اختيار الشهر',
      rtl: true,
      toCivil: (date) => toHijri(date),
      toDate: (year, month, day, hour, minute, second) => hijriToDateObject(year, month, day, hour, minute, second),
      monthLength: (year, month) => islamicMonthLength(year, month),
    },
    gregorian: {
      // Hardcoded per-language table rather than generated via
      // Intl.DateTimeFormat: Hermes's Intl support proved unreliable
      // on-device (verified — the exact same code gave correct output in
      // plain Node.js but showed the wrong month in the app), so this
      // follows the same static-table approach as PERSIAN_MONTHS/
      // ISLAMIC_MONTHS above.
      monthNames: GREGORIAN_MONTHS_BY_LANGUAGE[i18n.language] ?? GREGORIAN_MONTHS_BY_LANGUAGE.en,
      monthMeta: GREGORIAN_MONTH_META,
      weekdayLabels: GREGORIAN_WEEKDAYS_BY_LANGUAGE[i18n.language] ?? GREGORIAN_WEEKDAYS_BY_LANGUAGE.en,
      sheetTitle: t('events.chooseMonth'),
      rtl: false,
      toCivil: (date) => ({ year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() }),
      toDate: (year, month, day, hour, minute, second) => new Date(year, month - 1, day, hour, minute, second),
      monthLength: (year, month) => gregorianMonthLength(year, month),
    },
  };
  const adapter = adapters[calendar];
  // React Native auto-mirrors `flexDirection: 'row'` into right-to-left
  // only when I18nManager.isRTL is already on. ROW gives a calendar-driven
  // direction (right-to-left for Persian/Islamic, left-to-right for
  // Gregorian) regardless of the device's system language: if the two
  // already agree, plain 'row' is correct; if they disagree, flip to
  // 'row-reverse' to counter- (or force-) mirror. PHYSICAL_ROW instead
  // gives a true fixed left-to-right order regardless of *either* — used
  // for the header, where the prev/next chevrons must stay physically put.
  const ROW = adapter.rtl !== I18nManager.isRTL ? 'row-reverse' : 'row';
  const PHYSICAL_ROW = I18nManager.isRTL ? 'row-reverse' : 'row';

  const { year: cy, month: cm, day: cd } = adapter.toCivil(value);

  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [yearDraft, setYearDraft] = useState(String(cy));
  // Keep the year text field in sync when the year changes from elsewhere
  // (a different event loaded into the form) — adjusted during render
  // rather than in an effect, per React's documented "storing information
  // from previous renders" pattern (react.dev/learn/you-might-not-need-an-effect).
  const [prevCy, setPrevCy] = useState(cy);
  if (cy !== prevCy) {
    setPrevCy(cy);
    setYearDraft(String(cy));
  }

  function apply(nextYear: number, nextMonth: number, nextDay: number) {
    const maxDay = adapter.monthLength(nextYear, nextMonth);
    const clampedDay = Math.min(nextDay, maxDay);
    onChange(adapter.toDate(nextYear, nextMonth, clampedDay, value.getHours(), value.getMinutes(), value.getSeconds()));
  }

  function stepMonth(delta: number) {
    let newMonth = cm + delta;
    let newYear = cy;
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }
    apply(newYear, newMonth, cd);
  }

  function selectMonth(monthIndex1: number) {
    apply(cy, monthIndex1, cd);
    setMonthPickerOpen(false);
  }

  function onYearChangeText(text: string) {
    const latin = fromPersianDigits(text).slice(0, 4);
    setYearDraft(latin);
    const parsed = parseInt(latin, 10);
    if (!Number.isNaN(parsed) && parsed > 0) apply(parsed, cm, cd);
  }

  function selectDay(day: number) {
    apply(cy, cm, day);
  }

  const daysInMonth = adapter.monthLength(cy, cm);
  // Weekday of the 1st of this month, as a JS Date#getDay() index
  // (0=Sun..6=Sat) — noon avoids any DST-related off-by-one at midnight.
  const firstWeekday = adapter.toDate(cy, cm, 1, 12, 0, 0).getDay();
  const order = [0, 1, 2, 3, 4, 5, 6].map((i) => (prefs.firstDayOfWeek + i) % 7);
  const leading = order.indexOf(firstWeekday);

  const cells: (number | null)[] = [...Array(leading).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  const monthField = (
    <Pressable
      key="month"
      onPress={() => setMonthPickerOpen(true)}
      style={[styles.monthField, { flexDirection: PHYSICAL_ROW, backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.xs }]}
    >
      <Text style={[typography.bodyStrong, { color: colors.text, flex: 1, textAlign: 'center' }]} numberOfLines={1}>
        {adapter.monthNames[cm - 1]}
      </Text>
      <Ionicons name="chevron-down" size={16} color={colors.secondary} />
    </Pressable>
  );

  const yearField = (
    <View key="year" style={[styles.yearField, { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.xs }]}>
      <TextInput
        value={useFarsiDigits ? toPersianDigits(yearDraft) : yearDraft}
        onChangeText={onYearChangeText}
        keyboardType="number-pad"
        maxLength={4}
        style={[typography.bodyStrong, { color: colors.text, flex: 1, textAlign: 'center', padding: 0 }]}
      />
    </View>
  );

  return (
    <View>
      {/* The prev/next chevrons are pagination arrows — physically "<" on
          the left, ">" on the right always, regardless of the calendar's
          reading direction (matches the approved mockup for the RTL
          calendars too). So this row uses PHYSICAL_ROW (a true fixed
          left-to-right order, only counter-mirrored against the *system's*
          RTL setting, not the calendar's) with prev/next chevrons coded in
          that fixed physical order; only the month/year pair between them
          swaps order — [year, month] for an RTL calendar ("1405 شهریور",
          reading right-to-left as month-then-year), [month, year] for LTR
          ("August 2026"). */}
      <View style={[styles.header, { flexDirection: PHYSICAL_ROW }]}>
        <Pressable
          onPress={() => stepMonth(-1)}
          hitSlop={8}
          style={[styles.stepChevron, { backgroundColor: colors.surfaceAlt, borderRadius: radius.md }]}
        >
          <Ionicons name="chevron-back" size={18} color={colors.secondary} />
        </Pressable>

        <View style={[styles.middleRow, { flexDirection: PHYSICAL_ROW }]}>{adapter.rtl ? [yearField, monthField] : [monthField, yearField]}</View>

        <Pressable
          onPress={() => stepMonth(1)}
          hitSlop={8}
          style={[styles.stepChevron, { backgroundColor: colors.surfaceAlt, borderRadius: radius.md }]}
        >
          <Ionicons name="chevron-forward" size={18} color={colors.secondary} />
        </Pressable>
      </View>

      <View style={[styles.weekdayRow, { flexDirection: ROW }]}>
        {order.map((dayIdx) => (
          <Text key={dayIdx} style={[typography.caption, { color: colors.secondary, flex: 1, textAlign: 'center' }]} numberOfLines={1}>
            {adapter.weekdayLabels[dayIdx]}
          </Text>
        ))}
      </View>

      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={[styles.weekRow, { flexDirection: ROW }]}>
          {row.map((day, cellIndex) => {
            const isSelected = day === cd;
            return (
              <View key={cellIndex} style={styles.dayCell}>
                {day !== null && (
                  <Pressable
                    onPress={() => selectDay(day)}
                    style={[styles.dayButton, { borderRadius: radius.md }, isSelected && { backgroundColor: colors.primary }]}
                  >
                    <Text style={[typography.body, { color: isSelected ? '#FFFFFF' : colors.text }]}>
                      {useFarsiDigits ? toPersianDigits(day) : day}
                    </Text>
                    {isSelected && <View style={[styles.selectedDot, { backgroundColor: '#FFFFFF' }]} />}
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>
      ))}

      <Modal visible={monthPickerOpen} transparent animationType="slide" onRequestClose={() => setMonthPickerOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setMonthPickerOpen(false)}>
          <Pressable
            style={[
              styles.sheet,
              {
                backgroundColor: colors.surface,
                borderTopLeftRadius: radius.lg,
                borderTopRightRadius: radius.lg,
                padding: spacing.md,
                paddingBottom: spacing.lg,
              },
            ]}
          >
            <View style={[styles.sheetHandle, { backgroundColor: colors.outline }]} />
            <Text style={[typography.headline, { color: colors.text, textAlign: 'center', marginBottom: spacing.md }]}>
              {adapter.sheetTitle}
            </Text>

            <View style={[styles.monthGrid, { flexDirection: ROW }]}>
              {adapter.monthNames.map((name, index) => {
                const monthIndex1 = index + 1;
                const isSelected = monthIndex1 === cm;
                const meta = adapter.monthMeta[index];
                return (
                  <Pressable
                    key={name}
                    onPress={() => selectMonth(monthIndex1)}
                    style={[styles.monthCell, { borderRadius: radius.lg, backgroundColor: isSelected ? colors.primary : meta.bg }]}
                  >
                    <View style={styles.iconWrap}>
                      {meta.image ? (
                        <Image source={meta.image} style={styles.monthImage} resizeMode="contain" />
                      ) : meta.iconIsVector ? (
                        <Ionicons name={meta.icon as keyof typeof Ionicons.glyphMap} size={24} color={meta.iconColor} />
                      ) : (
                        <Text style={styles.monthEmoji}>{meta.icon}</Text>
                      )}
                      {meta.accent && <Text style={styles.iconAccent}>{meta.accent}</Text>}
                    </View>
                    <Text
                      style={[typography.body, { color: isSelected ? '#FFFFFF' : colors.text, marginTop: 6 }]}
                      numberOfLines={1}
                    >
                      {name}
                    </Text>
                    {isSelected && (
                      <View style={styles.checkBadge}>
                        <Ionicons name="checkmark" size={12} color={colors.primary} />
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>

            {adapter.doneLabel && (
              <Pressable
                onPress={() => setMonthPickerOpen(false)}
                style={[styles.doneButton, { backgroundColor: colors.primary, borderRadius: radius.lg, marginTop: spacing.md }]}
              >
                <Text style={[typography.bodyStrong, { color: '#FFFFFF' }]}>{adapter.doneLabel}</Text>
              </Pressable>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', gap: 8, marginBottom: 10 },
  stepChevron: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  middleRow: { flex: 1, alignItems: 'center', gap: 8 },
  monthField: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  yearField: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  weekdayRow: { marginBottom: 4 },
  weekRow: {},
  dayCell: { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  selectedDot: { position: 'absolute', bottom: 6, width: 4, height: 4, borderRadius: 2 },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { width: '100%' },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  monthGrid: { flexWrap: 'wrap', gap: 10 },
  monthCell: { width: '31%', paddingVertical: 16, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  iconWrap: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  monthEmoji: { fontSize: 22 },
  monthImage: { width: 26, height: 26 },
  iconAccent: { position: 'absolute', top: -4, right: -10, fontSize: 12 },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButton: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
});
