import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EventHeroCard } from '../../src/components/EventHeroCard';
import { EventIcon } from '../../src/components/EventIcon';
import { SegmentedControl } from '../../src/components/ui/SegmentedControl';
import { listEvents } from '../../src/storage/events';
import { usePreferences, useTheme } from '../../src/theme/PreferencesContext';
import type { PurEvent } from '../../src/types/event';
import { formatCivilDateFull, shouldUseFarsiDigits } from '../../src/utils/calendars';
import { fetchLocationPhotoUrl } from '../../src/utils/locationPhoto';
import { getNextOccurrence } from '../../src/utils/recurrence';

function daysUntil(iso: string): number {
  return Math.ceil(dayjs(iso).diff(dayjs(), 'hour') / 24);
}

// Bordered placeholder card for an empty Upcoming/Past list — a plain
// centered line of text read as an afterthought floating on the
// background, so this wraps it in a dashed, rounded "holder" (icon +
// message) matching the app's card language (radius.lg, colors.outline).
function EmptyState({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  const { colors, spacing, radius, typography } = useTheme();
  return (
    <View
      style={[
        styles.emptyBox,
        { borderColor: colors.outline, backgroundColor: colors.surfaceAlt, borderRadius: radius.lg, padding: spacing.xl },
      ]}
    >
      <Ionicons name={icon} size={30} color={colors.secondary} style={{ marginBottom: 10 }} />
      <Text style={[typography.body, styles.emptyText, { color: colors.secondary }]}>{text}</Text>
    </View>
  );
}

function EventRow({ event, onPress }: { event: PurEvent; onPress: () => void }) {
  const { colors, spacing, radius, typography } = useTheme();
  const { i18n } = useTranslation();
  const { prefs } = usePreferences();
  const nextOccurrence = getNextOccurrence(event.dateTimeISO, event.repeat);
  const days = daysUntil(nextOccurrence.toISOString());

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.sm + 4, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <EventIcon category={event.category} size={44} />
      <View style={styles.rowMiddle}>
        <Text style={[typography.bodyStrong, { color: colors.text }]} numberOfLines={1}>
          {event.title}
        </Text>
        <Text style={[typography.caption, { color: colors.secondary }]}>
          {formatCivilDateFull(nextOccurrence.toISOString(), prefs.calendar, shouldUseFarsiDigits(i18n.language))}
        </Text>
      </View>
      <View style={styles.rowRight}>
        <View style={styles.rowIcons}>
          {event.reminders.length > 0 ? <Ionicons name="notifications" size={14} color={colors.secondary} /> : null}
          {event.repeat !== 'none' ? (
            <Ionicons name="repeat" size={14} color={colors.secondary} style={{ marginLeft: 6 }} />
          ) : null}
        </View>
        <Text style={[typography.headline, { color: colors.text }]}>{Math.max(days, 0)}</Text>
        <Text style={[typography.caption, { color: colors.secondary }]}>DAYS</Text>
      </View>
    </Pressable>
  );
}

export default function EventListScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, spacing, typography } = useTheme();
  const [events, setEvents] = useState<PurEvent[]>([]);
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [heroPhotoUri, setHeroPhotoUri] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      listEvents().then((loaded) => {
        if (!cancelled) setEvents(loaded);
      });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  // Random photo of the device's current city/country — only for the top
  // hero banner, fetched once per app launch (mount, not per-focus — a new
  // one is wanted per run, not per tab visit). Failure (offline, no API
  // key, no results) just leaves it null and the hero card falls back to
  // its normal flat theme color.
  useEffect(() => {
    let cancelled = false;
    fetchLocationPhotoUrl().then((url) => {
      if (!cancelled) setHeroPhotoUri(url);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const { hero, rest, pastList } = useMemo(() => {
    const now = dayjs();
    // A repeating event's *next* occurrence is always upcoming by
    // definition — only a one-time (repeat: 'none') event can be "past".
    const isPast = (e: PurEvent) => e.repeat === 'none' && !dayjs(e.dateTimeISO).isAfter(now);
    const upcoming = events.filter((e) => !isPast(e));
    const past = events.filter(isPast).reverse();
    return { hero: upcoming[0], rest: upcoming.slice(1), pastList: past };
  }, [events]);

  const listData = tab === 'upcoming' ? rest : pastList;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top']}>
      <View style={[styles.header, { paddingHorizontal: spacing.md }]}>
        <Text style={[typography.title, { color: colors.text }]}>{t('appName')}</Text>
        <Pressable onPress={() => router.push('/event/new')} hitSlop={12}>
          <Ionicons name="add-circle" size={30} color={colors.primary} />
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: spacing.md, marginTop: spacing.sm }}>
        <SegmentedControl
          value={tab}
          onChange={setTab}
          options={[
            { value: 'upcoming', label: t('events.upcoming') },
            { value: 'past', label: t('events.past') },
          ]}
        />
      </View>

      <FlatList
        data={listData}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.md, gap: spacing.sm }}
        ListHeaderComponent={
          tab === 'upcoming' ? (
            hero ? (
              <Pressable onPress={() => router.push(`/event/${hero.id}`)} style={{ marginBottom: spacing.sm }}>
                <EventHeroCard event={hero} photoUri={heroPhotoUri ?? undefined} />
              </Pressable>
            ) : (
              // No events yet — still show the "Today" banner (see
              // EventHeroCard's no-event fallback), just not pressable.
              <View style={{ marginBottom: spacing.sm }}>
                <EventHeroCard photoUri={heroPhotoUri ?? undefined} />
              </View>
            )
          ) : null
        }
        ListEmptyComponent={
          // Upcoming: only empty if there's truly no event at all (hero
          // covers the first one, so an empty `rest` with a hero present
          // isn't "empty" — that one event is just shown above). Past:
          // independent of Upcoming's hero, just checks the past list
          // itself, with its own message (no "add your first countdown"
          // CTA — that action belongs to the Upcoming/global empty state).
          tab === 'upcoming' ? (
            !hero ? <EmptyState icon="calendar-outline" text={t('events.empty')} /> : null
          ) : pastList.length === 0 ? (
            <EmptyState icon="time-outline" text={t('events.emptyPast')} />
          ) : null
        }
        renderItem={({ item }) => <EventRow event={item} onPress={() => router.push(`/event/${item.id}`)} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowMiddle: { flex: 1, marginLeft: 12, gap: 2 },
  rowRight: { alignItems: 'flex-end' },
  rowIcons: { flexDirection: 'row', marginBottom: 4 },
  emptyBox: { alignItems: 'center', borderWidth: 1, borderStyle: 'dashed', marginTop: 40 },
  emptyText: { textAlign: 'center' },
});
