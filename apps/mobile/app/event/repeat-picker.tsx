import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../../src/theme/PreferencesContext';
import type { RepeatRule } from '../../src/types/event';
import { resolvePick } from '../../src/utils/pickerBridge';

const REPEATS: { key: RepeatRule; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'none', icon: 'ban-outline' },
  { key: 'weekly', icon: 'repeat-outline' },
  { key: 'monthly', icon: 'calendar-outline' },
  { key: 'yearly', icon: 'calendar-number-outline' },
];

// Full-screen repeat picker, same pattern as the category picker — opened
// from the "Repeat" row in the wizard's Advanced section.
export default function RepeatPickerScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, spacing, radius, typography } = useTheme();
  const { current } = useLocalSearchParams<{ current?: string }>();

  function pick(repeat: RepeatRule) {
    resolvePick(repeat);
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

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.md }}>
        <View style={styles.list}>
          {REPEATS.map(({ key, icon }) => {
            const selected = current === key;
            return (
              <Pressable
                key={key}
                onPress={() => pick(key)}
                style={({ pressed }) => [
                  styles.row,
                  {
                    backgroundColor: selected ? colors.primary : colors.surface,
                    borderRadius: radius.md,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Ionicons name={icon} size={22} color={selected ? colors.onPrimary : colors.secondary} />
                <Text style={[typography.bodyStrong, { color: selected ? colors.onPrimary : colors.text, flex: 1, marginLeft: 14, fontSize: 18 }]}>
                  {t(`events.repeat.${key}`)}
                </Text>
                {selected ? <Ionicons name="checkmark-circle" size={24} color={colors.onPrimary} /> : null}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  list: { gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14 },
});
