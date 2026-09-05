import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Alert, Linking, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../src/components/ui/Button';
import { Row } from '../../src/components/ui/Row';
import { Section } from '../../src/components/ui/Section';
import { listEvents } from '../../src/storage/events';
import { usePreferences, useTheme } from '../../src/theme/PreferencesContext';
import { usePro } from '../../src/subscription';
import { reminderLabel } from '../../src/utils/reminders';

function comingSoon() {
  Alert.alert('Coming soon', 'This will be available in a later release.');
}

export default function SettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, spacing, radius, typography } = useTheme();
  const { prefs, setPrefs } = usePreferences();
  const { isPro } = usePro();

  async function handleExport() {
    const events = await listEvents();
    await Share.share({ message: JSON.stringify(events, null, 2) });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.md }}>
        <Text style={[typography.title, { color: colors.text, marginBottom: spacing.md }]}>{t('settings.title')}</Text>

        <View
          style={[
            styles.proCard,
            { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.lg },
          ]}
        >
          <View style={[styles.proIcon, { backgroundColor: colors.primary }]}>
            <Ionicons name="diamond" size={20} color={colors.onPrimary} />
          </View>
          <View style={{ flex: 1, marginLeft: spacing.sm }}>
            <Text style={[typography.bodyStrong, { color: colors.text }]}>{t('settings.proPlan')}</Text>
            <Text style={[typography.caption, { color: colors.secondary }]}>
              {isPro ? t('compare.pro') : t('settings.freePlan')}
            </Text>
          </View>
          {!isPro ? (
            <Button
              variant="secondary"
              label={t('settings.viewPlans')}
              onPress={() => router.push('/upgrade')}
              style={styles.viewPlansButton}
            />
          ) : null}
        </View>

        <Section title={t('settings.preferences')}>
          <Row icon="color-palette-outline" label={t('settings.appearance')} value={t(`preferences.${prefs.appearance}`)} onPress={() => router.push('/preferences')} />
          <Row icon="globe-outline" label={t('settings.language')} value={t('preferences.system')} onPress={() => router.push('/preferences')} />
          <Row icon="calendar-outline" label={t('settings.calendar')} value={t(`preferences.${prefs.calendar}`)} onPress={() => router.push('/preferences')} />
          <Row icon="time-outline" label={t('settings.timezone')} value={t('settings.automatic')} onPress={() => router.push('/preferences')} />
        </Section>

        <Section title={t('settings.notifications')}>
          <Row
            type="switch"
            icon="notifications-outline"
            label={t('settings.notifications')}
            value={prefs.notificationsEnabled}
            onValueChange={(v) => setPrefs({ notificationsEnabled: v })}
          />
          <Row
            icon="alarm-outline"
            label={t('settings.defaultReminders')}
            value={reminderLabel(prefs.defaultReminderOffsets[0] ?? 1440, t)}
            onPress={() => router.push('/preferences')}
          />
          <Row
            type="switch"
            icon="volume-medium-outline"
            label={t('settings.soundsHaptics')}
            value={prefs.soundsHapticsEnabled}
            onValueChange={(v) => setPrefs({ soundsHapticsEnabled: v })}
          />
        </Section>

        <Section title={t('settings.dataPrivacy')}>
          <Row icon="cloud-outline" label={t('settings.backupSync')} value={t('settings.onThisDevice')} onPress={() => comingSoon()} />
          <Row icon="share-outline" label={t('settings.importExport')} onPress={handleExport} />
          <Row icon="shield-checkmark-outline" label={t('settings.privacy')} onPress={() => router.push('/privacy')} />
        </Section>

        <Section title={t('settings.about')}>
          <Row icon="help-circle-outline" label={t('settings.helpFeedback')} onPress={() => Linking.openURL('mailto:support@purevents.app')} />
          <Row icon="star-outline" label={t('settings.rateApp')} onPress={() => comingSoon()} />
          <Row icon="information-circle-outline" label={t('settings.about')} value={Constants.expoConfig?.version ?? '1.0.0'} onPress={() => router.push('/about')} />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  proCard: { flexDirection: 'row', alignItems: 'center' },
  proIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  viewPlansButton: { paddingHorizontal: 16, minHeight: 36 },
});
