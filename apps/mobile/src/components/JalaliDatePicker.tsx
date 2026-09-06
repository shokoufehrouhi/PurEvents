import { Ionicons } from '@expo/vector-icons';
import { jalaaliMonthLength, jalaaliToDateObject, toJalaali } from 'jalaali-js';
import { useState } from 'react';
import { I18nManager, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { usePreferences, useTheme } from '../theme/PreferencesContext';
import { fromPersianDigits, PERSIAN_MONTHS, PERSIAN_WEEKDAYS_BY_JS_DAY, toPersianDigits } from '../utils/calendars';

interface Props {
  value: Date;
  onChange: (date: Date) => void;
  // Farsi digits (۱۴۰۵) vs. Latin (1405) — tied to the UI language, not to
  // this being the Persian calendar (see calendars.ts shouldUseFarsiDigits):
  // an English-language user with the Shamsi calendar still reads 1405.
  useFarsiDigits: boolean;
}

// This picker only renders for the Persian/Shamsi calendar, which is
// conventionally read right-to-left regardless of the device's system
// language: Farvardin (month 1) belongs at the right of the month grid,
// Shanbe (the first weekday) at the right of the calendar — so these rows
// must render RTL *unconditionally*. React Native auto-mirrors
// `flexDirection: 'row'` into right-to-left only when I18nManager.isRTL is
// already on, so on an LTR system (isRTL false) we have to flip to
// 'row-reverse' ourselves to get that same right-to-left order; on an RTL
// system 'row' already renders right-to-left, so leave it alone there.
const ROW = I18nManager.isRTL ? 'row' : 'row-reverse';

// Icon + pastel chip background per Jalali month (index 0 = Farvardin),
// matching the seasonal iconography of a physical Persian calendar/planner —
// spring flowers, summer fruit/sun, autumn leaves, winter snow, and the
// Nowruz goldfish for Esfand.
const MONTH_META: { icon: string; bg: string }[] = [
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

// The native DateTimePicker only knows the Gregorian calendar (see UI
// feedback — locale='...@calendar=persian' changes the picker's language
// but not its actual calendar). This is a real calendar-grid picker backed
// by jalaali-js (exact, round-trip tested): month step chevrons flanking a
// month dropdown + typeable year, above a tappable day grid — used for the
// DATE portion only when calendar='persian'; time is picked separately.
export function JalaliDatePicker({ value, onChange, useFarsiDigits }: Props) {
  const { colors, radius, spacing, typography } = useTheme();
  const { prefs } = usePreferences();
  const { jy, jm, jd } = toJalaali(value);

  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [yearDraft, setYearDraft] = useState(String(jy));
  // Keep the year text field in sync when the year changes from elsewhere
  // (a different event loaded into the form) — adjusted during render
  // rather than in an effect, per React's documented "storing information
  // from previous renders" pattern (react.dev/learn/you-might-not-need-an-effect).
  const [prevJy, setPrevJy] = useState(jy);
  if (jy !== prevJy) {
    setPrevJy(jy);
    setYearDraft(String(jy));
  }

  function apply(nextJy: number, nextJm: number, nextJd: number) {
    const maxDay = jalaaliMonthLength(nextJy, nextJm);
    const clampedDay = Math.min(nextJd, maxDay);
    onChange(jalaaliToDateObject(nextJy, nextJm, clampedDay, value.getHours(), value.getMinutes(), value.getSeconds()));
  }

  function stepMonth(delta: number) {
    let newMonth = jm + delta;
    let newYear = jy;
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }
    apply(newYear, newMonth, jd);
  }

  function selectMonth(monthIndex1: number) {
    apply(jy, monthIndex1, jd);
    setMonthPickerOpen(false);
  }

  function onYearChangeText(text: string) {
    const latin = fromPersianDigits(text).slice(0, 4);
    setYearDraft(latin);
    const parsed = parseInt(latin, 10);
    if (!Number.isNaN(parsed) && parsed > 0) apply(parsed, jm, jd);
  }

  function selectDay(day: number) {
    apply(jy, jm, day);
  }

  const daysInMonth = jalaaliMonthLength(jy, jm);
  // Weekday of the 1st of this Jalali month, as a JS Date#getDay() index
  // (0=Sun..6=Sat) — noon avoids any DST-related off-by-one at midnight.
  const firstWeekday = jalaaliToDateObject(jy, jm, 1, 12, 0, 0).getDay();
  const order = [0, 1, 2, 3, 4, 5, 6].map((i) => (prefs.firstDayOfWeek + i) % 7);
  const leading = order.indexOf(firstWeekday);

  const cells: (number | null)[] = [...Array(leading).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  return (
    <View>
      {/* Coded [next-chevron, month, year, prev-chevron]: with ROW mirroring
          the first child to the right, this renders visually left-to-right
          as [prev, year, month, next] — "<" "1405" "Shahrivar ⌄" ">". */}
      <View style={styles.header}>
        <Pressable
          onPress={() => stepMonth(1)}
          hitSlop={8}
          style={[styles.stepChevron, { backgroundColor: colors.surfaceAlt, borderRadius: radius.md }]}
        >
          <Ionicons name="chevron-forward" size={18} color={colors.secondary} />
        </Pressable>

        <Pressable
          onPress={() => setMonthPickerOpen(true)}
          style={[styles.monthField, { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.xs }]}
        >
          <Text style={[typography.bodyStrong, { color: colors.text, flex: 1, textAlign: 'center' }]} numberOfLines={1}>
            {PERSIAN_MONTHS[jm - 1]}
          </Text>
          <Ionicons name="chevron-down" size={16} color={colors.secondary} />
        </Pressable>

        <View style={[styles.yearField, { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.xs }]}>
          <TextInput
            value={useFarsiDigits ? toPersianDigits(yearDraft) : yearDraft}
            onChangeText={onYearChangeText}
            keyboardType="number-pad"
            maxLength={4}
            style={[typography.bodyStrong, { color: colors.text, flex: 1, textAlign: 'center', padding: 0 }]}
          />
        </View>

        <Pressable
          onPress={() => stepMonth(-1)}
          hitSlop={8}
          style={[styles.stepChevron, { backgroundColor: colors.surfaceAlt, borderRadius: radius.md }]}
        >
          <Ionicons name="chevron-back" size={18} color={colors.secondary} />
        </Pressable>
      </View>

      <View style={styles.weekdayRow}>
        {order.map((dayIdx) => (
          <Text key={dayIdx} style={[typography.caption, { color: colors.secondary, flex: 1, textAlign: 'center' }]}>
            {PERSIAN_WEEKDAYS_BY_JS_DAY[dayIdx]}
          </Text>
        ))}
      </View>

      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.weekRow}>
          {row.map((day, cellIndex) => {
            const isSelected = day === jd;
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
            <Text style={[typography.headline, { color: colors.text, textAlign: 'center', marginBottom: spacing.md }]}>انتخاب ماه</Text>

            <View style={styles.monthGrid}>
              {PERSIAN_MONTHS.map((name, index) => {
                const monthIndex1 = index + 1;
                const isSelected = monthIndex1 === jm;
                const meta = MONTH_META[index];
                return (
                  <Pressable
                    key={name}
                    onPress={() => selectMonth(monthIndex1)}
                    style={[styles.monthCell, { borderRadius: radius.lg, backgroundColor: isSelected ? colors.primary : meta.bg }]}
                  >
                    {isSelected ? (
                      <View style={styles.checkBadge}>
                        <Ionicons name="checkmark" size={14} color={colors.primary} />
                      </View>
                    ) : (
                      <Text style={styles.monthEmoji}>{meta.icon}</Text>
                    )}
                    <Text
                      style={[typography.body, { color: isSelected ? '#FFFFFF' : colors.text, marginTop: 6 }]}
                      numberOfLines={1}
                    >
                      {name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: ROW, alignItems: 'center', gap: 8, marginBottom: 10 },
  stepChevron: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  monthField: { flex: 1, flexDirection: ROW, alignItems: 'center', justifyContent: 'center', gap: 6 },
  yearField: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  weekdayRow: { flexDirection: ROW, marginBottom: 4 },
  weekRow: { flexDirection: ROW },
  dayCell: { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  selectedDot: { position: 'absolute', bottom: 6, width: 4, height: 4, borderRadius: 2 },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { width: '100%' },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 14 },
  monthGrid: { flexDirection: ROW, flexWrap: 'wrap', gap: 10 },
  monthCell: { width: '31%', paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  monthEmoji: { fontSize: 22 },
  checkBadge: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
});
