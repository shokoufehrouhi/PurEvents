import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';
import { Text, View } from 'react-native';

import { useTheme } from '../src/theme/PreferencesContext';

export default function AboutScreen() {
  const { t } = useTranslation();
  const { colors, spacing, typography } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', paddingTop: spacing.xxl }}>
      <View style={[{ width: 72, height: 72, borderRadius: 20, backgroundColor: colors.primary }, { alignItems: 'center', justifyContent: 'center' }]}>
        <Ionicons name="calendar" size={34} color={colors.onPrimary} />
      </View>
      <Text style={[typography.headline, { color: colors.text, marginTop: spacing.md }]}>{t('appName')}</Text>
      <Text style={[typography.caption, { color: colors.secondary, marginTop: spacing.xs }]}>
        {t('settings.version')} {Constants.expoConfig?.version ?? '1.0.0'}
      </Text>
    </View>
  );
}
