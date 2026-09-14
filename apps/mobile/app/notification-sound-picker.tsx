import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Section } from '../src/components/ui/Section';
import { useTheme } from '../src/theme/PreferencesContext';
import type { NotificationSoundKey } from '../src/types/event';
import { resolvePick } from '../src/utils/pickerBridge';

const OPTIONS: NotificationSoundKey[] = ['default', 'chime', 'bell', 'ping', 'pulse'];

// Full push screen, same simple list+checkmark pattern as widget-corner-
// picker.tsx — no audio preview here (would need expo-audio + another
// native rebuild just for that); the names alone are descriptive enough
// to pick from for now.
export default function NotificationSoundPickerScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, spacing, typography } = useTheme();
  const { current } = useLocalSearchParams<{ current?: string }>();

  function pick(value: NotificationSoundKey) {
    resolvePick(value);
    router.back();
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing.md }}>
      <Section>
        {OPTIONS.map((value) => {
          const selected = (current || 'default') === value;
          return (
            <Pressable key={value} onPress={() => pick(value)} style={{ padding: spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[typography.body, { color: colors.text, flex: 1 }]}>{t(`events.notificationSound.${value}`)}</Text>
                {selected ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null}
              </View>
            </Pressable>
          );
        })}
      </Section>
    </ScrollView>
  );
}
