import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EventHeroCard } from '../../src/components/EventHeroCard';
import { SegmentedControl } from '../../src/components/ui/SegmentedControl';
import { listEvents } from '../../src/storage/events';
import { useTheme } from '../../src/theme/PreferencesContext';
import { accents } from '../../src/theme/tokens';
import type { PurEvent } from '../../src/types/event';

function daysUntil(iso: string): number {
  return Math.ceil(dayjs(iso).diff(dayjs(), 'hour') / 24);
}

function EventRow({ event, onPress }: { event: PurEvent; onPress: () => void }) {
  const { colors, spacing, radius, typography } = useTheme();
  const days = daysUntil(event.dateTimeISO);
  const accentColor = accents[event.accentColor] ?? accents.violet;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.sm + 4, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <View style={[styles.iconCircle, { backgroundColor: `${accentColor}22` }]}>
        <Text style={styles.iconEmoji}>{event.icon}</Text>
      </View>
      <View style={styles.rowMiddle}>
        <Text style={[typography.bodyStrong, { color: colors.text }]} numberOfLines={1}>
          {event.title}
        </Text>
        <Text style={[typography.caption, { color: colors.secondary }]}>
          {dayjs(event.dateTimeISO).format('MMM D, YYYY')}
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

  const { hero, rest, pastList } = useMemo(() => {
    const now = dayjs();
    const upcoming = events.filter((e) => dayjs(e.dateTimeISO).isAfter(now));
    const past = events.filter((e) => !dayjs(e.dateTimeISO).isAfter(now)).reverse();
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
          tab === 'upcoming' && hero ? (
            <Pressable onPress={() => router.push(`/event/${hero.id}`)} style={{ marginBottom: spacing.sm }}>
              <EventHeroCard event={hero} />
            </Pressable>
          ) : null
        }
        ListEmptyComponent={
          !hero ? (
            <Text style={[typography.body, styles.empty, { color: colors.secondary }]}>{t('events.empty')}</Text>
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
  iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  iconEmoji: { fontSize: 20 },
  rowMiddle: { flex: 1, marginLeft: 12, gap: 2 },
  rowRight: { alignItems: 'flex-end' },
  rowIcons: { flexDirection: 'row', marginBottom: 4 },
  empty: { textAlign: 'center', marginTop: 60, paddingHorizontal: 32 },
});
