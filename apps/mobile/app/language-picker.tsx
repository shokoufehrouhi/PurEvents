import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';

import { Section } from '../src/components/ui/Section';
import i18n, { SUPPORTED_LANGUAGES, type SupportedLanguage } from '../src/i18n';
import { useTheme } from '../src/theme/PreferencesContext';

const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: 'English',
  fa: 'فارسی',
  ar: 'العربية',
  es: 'Español',
  de: 'Deutsch',
  tr: 'Türkçe',
};

export default function LanguagePickerScreen() {
  const router = useRouter();
  const { colors, spacing, typography } = useTheme();

  function pick(lang: SupportedLanguage) {
    i18n.changeLanguage(lang);
    router.back();
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing.md }}>
      <Section>
        {SUPPORTED_LANGUAGES.map((lang) => {
          const selected = i18n.language === lang;
          return (
            <Pressable key={lang} onPress={() => pick(lang)} style={{ padding: spacing.md }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={[typography.body, { color: colors.text, flex: 1 }]}>{LANGUAGE_NAMES[lang]}</Text>
                {selected ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null}
              </View>
            </Pressable>
          );
        })}
      </Section>
    </ScrollView>
  );
}
