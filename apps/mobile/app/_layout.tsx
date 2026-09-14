import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { Stack, useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Modal, Pressable, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useTranslation } from 'react-i18next';

import { Button } from '../src/components/ui/Button';
import {
  describeOffset,
  extractNotificationInfo,
  initNotificationLogListeners,
  requestNotificationPermissions,
  type NotificationInfo,
} from '../src/notifications';
import { getEvent } from '../src/storage/events';
import { usePro } from '../src/subscription';
import { PreferencesProvider, useTheme } from '../src/theme/PreferencesContext';
import { getNextOccurrence } from '../src/utils/recurrence';

// Side-effect import: initializes i18next before any screen renders.
// NOTE: RTL languages (fa, ar — see src/i18n) only fully mirror the layout
// after I18nManager.forceRTL() + an app restart, which isn't wired up yet.
// Track as a follow-up before shipping fa/ar as selectable languages.
import '../src/i18n';

function Navigation() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, radius, spacing, scheme, typography } = useTheme();
  const { isPro } = usePro();
  // The notification the user just tapped — shown as a popup with its full
  // data (title/body/event/sent time) regardless of which screen the app
  // happens to be on, since a tap can arrive from a background or fully
  // killed state just as easily as while already inside the app.
  const [tappedNotification, setTappedNotification] = useState<NotificationInfo | null>(null);
  // How long until the event's *next* occurrence, computed fresh from now
  // (not the offset the reminder itself fired for) — null while looking it
  // up, or if the notification has no linked event at all.
  const [timeUntilEvent, setTimeUntilEvent] = useState<string | null>(null);
  // Reset synchronously during render (the "adjusting state while
  // rendering" pattern, see MiniWidget.tsx's own photoFailed reset) rather
  // than as a setState call in the effect body below, which a *new*
  // tappedNotification needs cleared before its own lookup resolves —
  // otherwise the previous notification's stale value would flash first.
  const [checkedNotificationId, setCheckedNotificationId] = useState<string | null>(null);
  if ((tappedNotification?.id ?? null) !== checkedNotificationId) {
    setCheckedNotificationId(tappedNotification?.id ?? null);
    setTimeUntilEvent(null);
  }

  useEffect(() => {
    if (!tappedNotification?.eventId) return;
    let cancelled = false;
    getEvent(tappedNotification.eventId).then((event) => {
      if (cancelled || !event) return;
      const next = getNextOccurrence(event.dateTimeISO, event.repeat);
      const minutesLeft = next.diff(dayjs(), 'minute');
      setTimeUntilEvent(minutesLeft <= 0 ? null : describeOffset(minutesLeft));
    });
    return () => {
      cancelled = true;
    };
  }, [tappedNotification]);

  useEffect(() => {
    requestNotificationPermissions();
    const cleanupLog = initNotificationLogListeners();

    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      setTappedNotification(extractNotificationInfo(response.notification));
    });
    // Cold start (app was fully closed, launched *by* tapping the
    // notification) — the listener above only catches taps received while
    // it's already subscribed, so also check for one that was already
    // waiting.
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) setTappedNotification(extractNotificationInfo(response.notification));
    });

    return () => {
      cleanupLog();
      responseSub.remove();
    };
  }, []);

  const headerOptions = {
    headerShown: true,
    headerStyle: { backgroundColor: colors.surface },
    headerTintColor: colors.text,
    headerShadowVisible: false,
  };

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="day" options={{ ...headerOptions, title: t('tabs.events'), headerBackTitle: t('day.backTitle') }} />
        {/* Push, not modal — opens the same way event/[id]/index (Details)
            does, per explicit request to match that navigation feel. */}
        <Stack.Screen name="event/new" />
        <Stack.Screen name="event/category-picker" />
        <Stack.Screen name="event/repeat-picker" />
        <Stack.Screen name="event/[id]/index" />
        <Stack.Screen name="event/[id]/edit" />
        <Stack.Screen
          name="preferences"
          options={{ ...headerOptions, title: t('preferences.title'), headerBackTitle: t('settings.title') }}
        />
        <Stack.Screen
          name="language-picker"
          options={{ ...headerOptions, title: t('preferences.language'), headerBackTitle: t('preferences.title') }}
        />
        <Stack.Screen
          name="theme-picker"
          options={{ ...headerOptions, title: t('preferences.appearance'), headerBackTitle: t('preferences.title') }}
        />
        <Stack.Screen
          name="calendar-picker"
          options={{ ...headerOptions, title: t('preferences.calendar'), headerBackTitle: t('preferences.title') }}
        />
        <Stack.Screen
          name="first-day-picker"
          options={{ ...headerOptions, title: t('preferences.firstDayOfWeek'), headerBackTitle: t('preferences.title') }}
        />
        <Stack.Screen
          name="time-format-picker"
          options={{ ...headerOptions, title: t('preferences.timeFormat'), headerBackTitle: t('preferences.title') }}
        />
        <Stack.Screen
          name="timezone-picker"
          options={{ ...headerOptions, title: t('preferences.currentTimezone'), headerBackTitle: t('preferences.title') }}
        />
        {/* headerBackButtonDisplayMode 'minimal', not a title string, to
            match the reference design's plain chevron. */}
        <Stack.Screen
          name="upgrade"
          options={{ ...headerOptions, title: t('compare.title'), headerBackButtonDisplayMode: 'minimal' }}
        />
        <Stack.Screen
          name="custom-widget"
          options={{ ...headerOptions, title: t('widgets.customWidgetTitle'), headerBackTitle: t('widgets.title') }}
        />
        <Stack.Screen
          name="widget-size-picker"
          options={{ ...headerOptions, title: t('widgets.widgetSize'), headerBackTitle: t('widgets.customWidgetTitle') }}
        />
        {/* headerBackButtonDisplayMode 'minimal', not a headerBackTitle
            string — New/Edit Event (whichever opened this) doesn't expose
            one shared title this could reuse, same as
            event/repeat-picker's own back chevron having no label
            either. (headerBackTitle: '' alone doesn't reliably suppress
            the fallback label here.) */}
        <Stack.Screen
          name="reminder-picker"
          options={{ ...headerOptions, title: t('events.stepReminders'), headerBackButtonDisplayMode: 'minimal' }}
        />
        <Stack.Screen
          name="widget-overlay-picker"
          options={{ ...headerOptions, title: t('widgets.overlay'), headerBackTitle: t('widgets.customWidgetTitle') }}
        />
        <Stack.Screen
          name="widget-accent-picker"
          options={{ ...headerOptions, title: t('widgets.accentColor'), headerBackTitle: t('widgets.customWidgetTitle') }}
        />
        <Stack.Screen
          name="widget-corner-picker"
          options={{ ...headerOptions, title: t('widgets.cornerStyle'), headerBackTitle: t('widgets.customWidgetTitle') }}
        />
        <Stack.Screen
          name="widget-text-style-picker"
          options={{ ...headerOptions, title: t('widgets.textStyle'), headerBackTitle: t('widgets.customWidgetTitle') }}
        />
        {/* Opened from the New/Edit Event wizard's own Advanced section —
            same no-shared-back-title reasoning as reminder-picker above. */}
        <Stack.Screen
          name="notification-sound-picker"
          options={{ ...headerOptions, title: t('events.notificationSoundLabel'), headerBackButtonDisplayMode: 'minimal' }}
        />
        <Stack.Screen
          name="category-themes"
          options={{ ...headerOptions, title: t('widgets.categoryThemes'), headerBackTitle: t('widgets.title') }}
        />
        <Stack.Screen
          name="widget-picker"
          options={{
            ...headerOptions,
            title: t('widgets.chooseWidget'),
            headerBackTitle: t('widgets.title'),
            // "Upgrade" CTA, not a plan-status badge — only shown to a free
            // user (isPro true hides it, nothing left to upsell). The
            // label itself is "Get Pro", not bare "Pro" — the bare word
            // read like a status badge ("you have Pro") even to a free
            // user looking right at correctly-locked content underneath,
            // rather than the tap-to-upgrade prompt it actually is.
            headerRight: isPro
              ? undefined
              : () => (
                  <Pressable
                    onPress={() => router.push('/upgrade')}
                    hitSlop={8}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: colors.primary,
                      borderRadius: 999,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                    }}
                  >
                    <Ionicons name="diamond" size={11} color="#fff" />
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800', marginLeft: 4 }}>{t('widgets.getPro').toUpperCase()}</Text>
                  </Pressable>
                ),
          }}
        />
        <Stack.Screen
          name="notification-settings"
          options={{ ...headerOptions, title: t('settings.notifications'), headerBackTitle: t('settings.title') }}
        />
        <Stack.Screen
          name="notification-history"
          options={{ ...headerOptions, title: t('settings.notificationHistory'), headerBackTitle: t('settings.notifications') }}
        />
        <Stack.Screen
          name="data-privacy"
          options={{ ...headerOptions, title: t('settings.dataPrivacy'), headerBackTitle: t('settings.title') }}
        />
        <Stack.Screen
          name="privacy"
          options={{ ...headerOptions, title: t('settings.privacy'), headerBackTitle: t('settings.title') }}
        />
        <Stack.Screen
          name="terms"
          options={{ ...headerOptions, title: t('settings.termsOfUse'), headerBackButtonDisplayMode: 'minimal' }}
        />
        <Stack.Screen
          name="about"
          options={{ ...headerOptions, title: t('settings.about'), headerBackTitle: t('settings.title') }}
        />
      </Stack>

      {/* Tap-a-notification popup — global (rendered above the whole Stack,
          not any one screen) since a tap can arrive while the app is on
          any screen, or launch the app fresh from a killed state (see the
          getLastNotificationResponseAsync check above). Shows every field
          the notification actually carried, not just its own title/body
          banner. */}
      <Modal visible={!!tappedNotification} transparent animationType="fade" onRequestClose={() => setTappedNotification(null)}>
        <Pressable
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', padding: spacing.lg }}
          onPress={() => setTappedNotification(null)}
        >
          {/* Inner Pressable with no-op onPress so tapping the card itself
              doesn't bubble to the backdrop's dismiss handler. */}
          <Pressable
            onPress={() => {}}
            style={{ width: '100%', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md }}
          >
            <Text style={[typography.headline, { color: colors.text }]}>{tappedNotification?.title}</Text>
            <Text style={[typography.body, { color: colors.secondary, marginTop: 6 }]}>{tappedNotification?.body}</Text>

            <View style={{ marginTop: spacing.md, gap: 4 }}>
              {tappedNotification?.eventId ? (
                <Text style={[typography.caption, { color: colors.secondary }]}>
                  {t('notificationPopup.eventIdLabel')}: {tappedNotification.eventId}
                </Text>
              ) : null}
              <Text style={[typography.caption, { color: colors.secondary }]}>
                {t('notificationPopup.sentLabel')}: {tappedNotification ? dayjs(tappedNotification.firedAt).format('MMM D, YYYY · h:mm A') : ''}
              </Text>
              {/* Recomputed from now, not the offset this reminder actually
                  fired for — a repeating event's *next* cycle in
                  particular can be a completely different distance away
                  than whatever this specific notification was about. */}
              {timeUntilEvent ? (
                <Text style={[typography.caption, { color: colors.secondary }]}>
                  {t('notificationPopup.timeUntilLabel')}: {timeUntilEvent}
                </Text>
              ) : null}
            </View>

            <View style={{ flexDirection: 'row', marginTop: spacing.md }}>
              {tappedNotification?.eventId ? (
                <Button
                  label={t('notificationPopup.viewEvent')}
                  onPress={() => {
                    const eventId = tappedNotification.eventId;
                    setTappedNotification(null);
                    router.push(`/event/${eventId}`);
                  }}
                  style={{ flex: 1, marginRight: 8 }}
                />
              ) : null}
              <Button
                label={t('notificationPopup.close')}
                variant="secondary"
                onPress={() => setTappedNotification(null)}
                style={{ flex: 1 }}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <PreferencesProvider>
        <Navigation />
      </PreferencesProvider>
    </SafeAreaProvider>
  );
}
