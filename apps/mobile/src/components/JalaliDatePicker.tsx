import { Ionicons } from '@expo/vector-icons';
import { jalaaliMonthLength, jalaaliToDateObject, toJalaali } from 'jalaali-js';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { usePreferences, useTheme } from '../theme/PreferencesContext';
import { PERSIAN_MONTHS, PERSIAN_WEEKDAYS_BY_JS_DAY } from '../utils/calendars';

interface Props {
  value: Date;
  onChange: (date: Date) => void;
}

interface HeaderStepperProps {
  label: string;
  onPrev: () => void;
  onNext: () => void;
}

function HeaderStepper({ label, onPrev, onNext }: HeaderStepperProps) {
  const { colors, radius, spacing, typography } = useTheme();
  return (
    <View style={[styles.headerStepper, { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.xs }]}>
      <Pressable onPress={onPrev} hitSlop={8} style={styles.chevron}>
        <Ionicons name="chevron-back" size={16} color={colors.secondary} />
      </Pressable>
      <Text style={[typography.bodyStrong, { color: colors.text, minWidth: 64, textAlign: 'center' }]} numberOfLines={1}>
        {label}
      </Text>
      <Pressable onPress={onNext} hitSlop={8} style={styles.chevron}>
        <Ionicons name="chevron-forward" size={16} color={colors.secondary} />
      </Pressable>
    </View>
  );
}

// The native DateTimePicker only knows the Gregorian calendar (see UI
// feedback — locale='...@calendar=persian' changes the picker's language
// but not its actual calendar). This is a real calendar-grid picker backed
// by jalaali-js (exact, round-trip tested): a month/year header to
// navigate, and a tappable day grid below, same shape as the native
// calendar UI — used for the DATE portion only when calendar='persian';
// time is still picked with the native time-only picker since hours/minutes
// don't depend on calendar.
export function JalaliDatePicker({ value, onChange }: Props) {
  const { colors, radius, typography } = useTheme();
  const { prefs } = usePreferences();
  const { jy, jm, jd } = toJalaali(value);

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

  function stepYear(delta: number) {
    apply(jy + delta, jm, jd);
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
        <HeaderStepper label={PERSIAN_MONTHS[jm - 1]} onPrev={() => stepMonth(-1)} onNext={() => stepMonth(1)} />
        <HeaderStepper label={String(jy)} onPrev={() => stepYear(-1)} onNext={() => stepYear(1)} />
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
                    style={[
                      styles.dayButton,
                      { borderRadius: radius.md },
                      isSelected && { backgroundColor: colors.primary },
                    ]}
                  >
                    <Text style={[typography.body, { color: isSelected ? '#FFFFFF' : colors.text }]}>{day}</Text>
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  headerStepper: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chevron: { padding: 4 },
  weekdayRow: { flexDirection: 'row', marginBottom: 4 },
  weekRow: { flexDirection: 'row' },
  dayCell: { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayButton: { width: '78%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
});
