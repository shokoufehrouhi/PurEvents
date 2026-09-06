import { Ionicons } from '@expo/vector-icons';
import { jalaaliMonthLength, jalaaliToDateObject, toJalaali } from 'jalaali-js';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme/PreferencesContext';
import { PERSIAN_MONTHS } from '../utils/calendars';

interface Props {
  value: Date;
  onChange: (date: Date) => void;
}

interface StepperProps {
  label: string;
  onPrev: () => void;
  onNext: () => void;
}

function Stepper({ label, onPrev, onNext }: StepperProps) {
  const { colors, radius, spacing, typography } = useTheme();
  return (
    <View style={[styles.stepper, { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.xs }]}>
      <Pressable onPress={onPrev} hitSlop={8} style={styles.chevron}>
        <Ionicons name="chevron-back" size={16} color={colors.secondary} />
      </Pressable>
      <Text style={[typography.bodyStrong, { color: colors.text, minWidth: 56, textAlign: 'center' }]} numberOfLines={1}>
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
// but not its actual calendar). This is a small hand-built Jalali date
// stepper backed by jalaali-js (exact, round-trip tested), used for the
// DATE portion only when calendar='persian'; time is still picked with the
// native time-only picker since hours/minutes don't depend on calendar.
export function JalaliDatePicker({ value, onChange }: Props) {
  const { jy, jm, jd } = toJalaali(value);

  function apply(nextJy: number, nextJm: number, nextJd: number) {
    const maxDay = jalaaliMonthLength(nextJy, nextJm);
    const clampedDay = Math.min(nextJd, maxDay);
    onChange(jalaaliToDateObject(nextJy, nextJm, clampedDay, value.getHours(), value.getMinutes(), value.getSeconds()));
  }

  function stepDay(delta: number) {
    apply(jy, jm, jd + delta);
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

  return (
    <View style={styles.row}>
      <Stepper label={String(jd)} onPrev={() => stepDay(-1)} onNext={() => stepDay(1)} />
      <Stepper label={PERSIAN_MONTHS[jm - 1]} onPrev={() => stepMonth(-1)} onNext={() => stepMonth(1)} />
      <Stepper label={String(jy)} onPrev={() => stepYear(-1)} onNext={() => stepYear(1)} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  stepper: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  chevron: { padding: 4 },
});
