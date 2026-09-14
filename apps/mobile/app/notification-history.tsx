import dayjs from 'dayjs';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Text, View } from 'react-native';

import { EmptyState } from '../src/components/ui/EmptyState';
import { markAllNotificationsSeen, listNotificationLog, type NotificationLogEntry } from '../src/storage/notificationLog';
import { usePreferences, useTheme } from '../src/theme/PreferencesContext';
import { accents } from '../src/theme/tokens';

function NotificationRow({ entry }: { entry: NotificationLogEntry }) {
  const { colors, spacing, radius, typography } = useTheme();
  const { prefs } = usePreferences();
  const timeLabel = dayjs(entry.firedAt).format(prefs.timeFormat === '12h' ? 'MMM D, h:mm A' : 'MMM D, HH:mm');

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        padding: spacing.sm + 4,
      }}
    >
      {/* Unseen dot — same idea as an unread-mail indicator, cleared for
          good the next time this screen is opened (see markAllNotificationsSeen
          below), not per-row. */}
      <View style={{ width: 8, alignItems: 'center', marginTop: 6 }}>
        {!entry.seen ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary }} /> : null}
      </View>
      <View style={{ flex: 1, marginLeft: 8 }}>
        <Text style={[typography.bodyStrong, { color: colors.text }]} numberOfLines={1}>
          {entry.title}
        </Text>
        <Text style={[typography.body, { color: colors.secondary, marginTop: 2 }]} numberOfLines={2}>
          {entry.body}
        </Text>
        <Text style={[typography.caption, { color: colors.secondary, marginTop: 4 }]}>{timeLabel}</Text>
      </View>
    </View>
  );
}

// Settings > Notifications > Notification History — everything the app has
// actually notified the user about (not what's merely scheduled, see
// EventDetail's own Reminder section for that), newest first. See
// notifications/index.ts's listeners for how this log gets built; there's
// no way to reconstruct it after the fact, so it only ever contains what
// fired since that wiring went live.
export default function NotificationHistoryScreen() {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const [entries, setEntries] = useState<NotificationLogEntry[]>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      listNotificationLog().then((loaded) => {
        if (cancelled) return;
        // Snapshot first (so this visit still renders whichever rows were
        // actually unseen when it opened), *then* mark them seen — the next
        // visit (and the Settings row's own "N new" badge) starts clean.
        setEntries(loaded);
        markAllNotificationsSeen();
      });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.md, gap: spacing.sm, flexGrow: 1 }}
      data={entries}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <NotificationRow entry={item} />}
      ListEmptyComponent={
        <EmptyState
          icon="notifications-outline"
          badgeIcon="checkmark"
          badgeColor={accents.mint}
          title={t('notificationHistory.emptyTitle')}
          subtitle={t('notificationHistory.emptySubtitle')}
        />
      }
    />
  );
}
