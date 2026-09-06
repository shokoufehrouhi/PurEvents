import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../src/components/ui/Button';
import { useTheme } from '../../src/theme/PreferencesContext';
import { accents } from '../../src/theme/tokens';
import type { RepeatRule } from '../../src/types/event';
import { resolvePick } from '../../src/utils/pickerBridge';

function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

const REPEATS: { key: RepeatRule; color: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'none', color: accents.violet, icon: 'ban' },
  { key: 'weekly', color: '#2F9BFF', icon: 'repeat' },
  { key: 'monthly', color: accents.coral, icon: 'calendar' },
  { key: 'yearly', color: accents.mint, icon: 'calendar-number' },
];

// Full-screen repeat picker matching the approved design: each option has
// its own accent color, a date-aware description ("Every week on
// Wednesday"), and a Done button (tapping a row only selects it locally —
// same pattern the reference mockup uses, unlike category/theme pickers
// which resolve immediately on tap).
export default function RepeatPickerScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, spacing, radius, typography } = useTheme();
  const { current, date: dateParam } = useLocalSearchParams<{ current?: string; date?: string }>();
  const [selected, setSelected] = useState<RepeatRule>((current as RepeatRule) ?? 'none');

  const date = dayjs(dateParam);

  function describeRepeat(key: RepeatRule): string {
    switch (key) {
      case 'weekly':
        return t('events.repeatWeeklyDesc', { day: date.format('dddd') });
      case 'monthly':
        return t('events.repeatMonthlyDesc', { day: ordinal(date.date()) });
      case 'yearly':
        return t('events.repeatYearlyDesc', { date: date.format('MMMM D') });
      case 'none':
      default:
        return t('events.repeatNoneDesc');
    }
  }

  function handleDone() {
    resolvePick(selected);
    router.back();
  }

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { padding: spacing.md }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[typography.bodyStrong, { color: colors.text }]}>{t('events.repeatLabel')}</Text>
        <View style={{ width: 24 }} />
      </View>
      <Text style={[typography.caption, { color: colors.secondary, textAlign: 'center', marginBottom: spacing.md }]}>
        {t('events.repeatSubtitle')}
      </Text>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.md, paddingTop: 0 }}>
        <View style={styles.list}>
          {REPEATS.map(({ key, color, icon }) => {
            const isSelected = selected === key;
            return (
              <Pressable
                key={key}
                onPress={() => setSelected(key)}
                style={[
                  styles.row,
                  { backgroundColor: isSelected ? color : `${color}1A`, borderRadius: radius.lg, padding: spacing.md },
                ]}
              >
                <View style={[styles.iconBadge, { backgroundColor: isSelected ? '#fff' : color, borderRadius: radius.md }]}>
                  <Ionicons name={icon} size={20} color={isSelected ? color : '#fff'} />
                </View>
                <View style={styles.rowText}>
                  <Text style={[typography.bodyStrong, { color: isSelected ? '#fff' : colors.text, fontSize: 17 }]}>
                    {t(`events.repeat.${key}`)}
                  </Text>
                  <Text style={[typography.caption, { color: isSelected ? 'rgba(255,255,255,0.85)' : colors.secondary, marginTop: 2 }]}>
                    {describeRepeat(key)}
                  </Text>
                </View>
                <View
                  style={[
                    styles.radio,
                    { borderColor: isSelected ? '#fff' : color, backgroundColor: isSelected ? '#fff' : 'transparent' },
                  ]}
                >
                  {isSelected ? <Ionicons name="checkmark" size={16} color={color} /> : null}
                </View>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={{ padding: spacing.md }}>
        <Button label={t('events.done')} onPress={handleDone} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  list: { gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center' },
  iconBadge: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, marginLeft: 14 },
  radio: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
