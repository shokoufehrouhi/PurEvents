import { Ionicons } from '@expo/vector-icons';
import { jalaaliMonthLength, jalaaliToDateObject, toJalaali } from 'jalaali-js';
import { useState } from 'react';
import { I18nManager, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { usePreferences, useTheme } from '../theme/PreferencesContext';
import { fromPersianDigits, PERSIAN_MONTHS, PERSIAN_WEEKDAYS_BY_JS_DAY, toPersianDigits } from '../utils/calendars';

interface Props {
  value: Date;
  onChange: (date: Date) => void;
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

// The native DateTimePicker only knows the Gregorian calendar (see UI
// feedback — locale='...@calendar=persian' changes the picker's language
// but not its actual calendar). This is a real calendar-grid picker backed
// by jalaali-js (exact, round-trip tested): a month dropdown + a typeable
// year above a tappable day grid — used for the DATE portion only when
// calendar='persian'; time is still picked with the native time-only
// picker since hours/minutes don't depend on calendar.
export function JalaliDatePicker({ value, onChange }: Props) {
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
      <View style={styles.header}>
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
            value={toPersianDigits(yearDraft)}
            onChangeText={onYearChangeText}
            keyboardType="number-pad"
            maxLength={4}
            style={[typography.bodyStrong, { color: colors.text, flex: 1, textAlign: 'center', padding: 0 }]}
          />
        </View>
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
                    <Text style={[typography.body, { color: isSelected ? '#FFFFFF' : colors.text }]}>{toPersianDigits(day)}</Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>
      ))}

      <Modal visible={monthPickerOpen} transparent animationType="fade" onRequestClose={() => setMonthPickerOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setMonthPickerOpen(false)}>
          <Pressable style={[styles.monthSheet, { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md }]}>
            <View style={styles.monthGrid}>
              {PERSIAN_MONTHS.map((name, index) => {
                const monthIndex1 = index + 1;
                const isSelected = monthIndex1 === jm;
                return (
                  <Pressable
                    key={name}
                    onPress={() => selectMonth(monthIndex1)}
                    style={[
                      styles.monthCell,
                      { borderRadius: radius.md, backgroundColor: isSelected ? colors.primary : colors.surfaceAlt },
                    ]}
                  >
                    <Text style={[typography.body, { color: isSelected ? '#FFFFFF' : colors.text }]} numberOfLines={1}>
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
  header: { flexDirection: ROW, gap: 8, marginBottom: 10 },
  monthField: { flex: 1, flexDirection: ROW, alignItems: 'center', justifyContent: 'center', gap: 6 },
  yearField: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  weekdayRow: { flexDirection: ROW, marginBottom: 4 },
  weekRow: { flexDirection: ROW },
  dayCell: { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayButton: { width: '78%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  monthSheet: { width: '100%', maxWidth: 360 },
  monthGrid: { flexDirection: ROW, flexWrap: 'wrap', gap: 8 },
  monthCell: { width: '30.5%', paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
});
