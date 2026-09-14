import { ScrollView } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Row } from '../src/components/ui/Row';
import { Section } from '../src/components/ui/Section';
import { unseenNotificationCount } from '../src/storage/notificationLog';
import { usePreferences, useTheme } from '../src/theme/PreferencesContext';
import { rowBadgeColors } from '../src/theme/tokens';
import { reminderLabel } from '../src/utils/reminders';

// Sub-screen for the Settings "Notifications" menu row — moved out of the
// Settings tab's own inline Section per explicit request that each of its
// 4 top-level menus (Appearance/Notifications/Data & Privacy/About) drill
// into its own screen instead of showing sub-rows inline.
export default function NotificationSettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, spacing } = useTheme();
  const { prefs, setPrefs } = usePreferences();
  const [unseenCount, setUnseenCount] = useState(0);

  // Re-read every time this screen regains focus — coming back from
  // History (which marks everything seen on open) should clear the badge
  // below without needing to leave/re-enter Settings entirely.
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      unseenNotificationCount().then((count) => {
        if (!cancelled) setUnseenCount(count);
      });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing.md }}>
      <Section>
        <Row
          type="switch"
          icon="notifications-outline"
          badgeColor={rowBadgeColors.red}
          label={t('settings.notifications')}
          value={prefs.notificationsEnabled}
          onValueChange={(v) => setPrefs({ notificationsEnabled: v })}
        />
        <Row
          icon="alarm-outline"
          badgeColor={rowBadgeColors.orange}
          label={t('settings.defaultReminders')}
          value={reminderLabel(prefs.defaultReminderOffsets[0] ?? 1440, t)}
          onPress={() => router.push('/preferences')}
        />
        <Row
          type="switch"
          icon="volume-medium-outline"
          badgeColor={rowBadgeColors.purple}
          label={t('settings.soundsHaptics')}
          value={prefs.soundsHapticsEnabled}
          onValueChange={(v) => setPrefs({ soundsHapticsEnabled: v })}
        />
        <Row
          icon="time-outline"
          badgeColor={rowBadgeColors.blue}
          label={t('settings.notificationHistory')}
          value={unseenCount > 0 ? t('notificationHistory.newCount', { count: unseenCount }) : undefined}
          onPress={() => router.push('/notification-history')}
        />
      </Section>
    </ScrollView>
  );
}
