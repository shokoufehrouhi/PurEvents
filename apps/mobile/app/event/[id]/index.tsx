import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import dayjs from 'dayjs';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HeroCountdown } from '../../../src/components/HeroCountdown';
import { Button } from '../../../src/components/ui/Button';
import { Section } from '../../../src/components/ui/Section';
import { cancelRemindersForEvent } from '../../../src/notifications';
import { deleteEvent, getEvent } from '../../../src/storage/events';
import { useTheme } from '../../../src/theme/PreferencesContext';
import { accents } from '../../../src/theme/tokens';
import { EventIcon } from '../../../src/components/EventIcon';
import type { PurEvent } from '../../../src/types/event';
import { darken } from '../../../src/utils/color';
import { reminderLabel } from '../../../src/utils/reminders';

export default function EventDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, spacing, typography } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [event, setEvent] = useState<PurEvent | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (id) getEvent(id).then((e) => setEvent(e ?? null));
    }, [id])
  );

  if (!event) return null;

  async function handleDelete() {
    Alert.alert(t('events.delete'), event!.title, [
      { text: t('events.back'), style: 'cancel' },
      {
        text: t('events.delete'),
        style: 'destructive',
        onPress: async () => {
          await cancelRemindersForEvent(event!.id);
          await deleteEvent(event!.id);
          router.back();
        },
      },
    ]);
  }

  async function handleShare() {
    await Share.share({
      message: `${event!.title} — ${dayjs(event!.dateTimeISO).format('YYYY-MM-DD HH:mm')}`,
    });
  }

  const base = accents[event.accentColor] ?? accents.violet;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <LinearGradient colors={[base, darken(base, 0.35)]} style={styles.hero}>
        <SafeAreaView edges={['top']}>
          <View style={[styles.heroHeader, { paddingHorizontal: spacing.md }]}>
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </Pressable>
            <View style={styles.heroHeaderRight}>
              <Pressable onPress={() => router.push(`/event/${event.id}/edit`)} hitSlop={12}>
                <Ionicons name="create-outline" size={22} color="#fff" />
              </Pressable>
              <Pressable onPress={handleDelete} hitSlop={12} style={{ marginLeft: 16 }}>
                <Ionicons name="ellipsis-horizontal" size={22} color="#fff" />
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
        <View style={[styles.heroBody, { padding: spacing.md }]}>
          <EventIcon iconKey={event.icon} size={40} />
          <Text style={styles.heroTitle}>{event.title}</Text>
          <HeroCountdown targetISO={event.dateTimeISO} />
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={{ padding: spacing.md }}>
        <Section>
          <View style={[styles.infoRow, { padding: spacing.md }]}>
            <Ionicons name="calendar-outline" size={18} color={colors.secondary} />
            <Text style={[typography.body, { color: colors.text, marginLeft: 10 }]}>
              {dayjs(event.dateTimeISO).format('MMM D, YYYY (ddd)')}
            </Text>
          </View>
          <View style={[styles.infoRow, { padding: spacing.md }]}>
            <Ionicons name="globe-outline" size={18} color={colors.secondary} />
            <Text style={[typography.body, { color: colors.text, marginLeft: 10 }]}>{event.timezone}</Text>
          </View>
        </Section>

        <Section title={t('events.remindersLabel')}>
          {event.reminders.length === 0 ? (
            <View style={{ padding: spacing.md }}>
              <Text style={[typography.body, { color: colors.secondary }]}>—</Text>
            </View>
          ) : (
            event.reminders.map((offset) => (
              <View key={offset} style={[styles.infoRow, { padding: spacing.md }]}>
                <Ionicons name="notifications-outline" size={18} color={colors.secondary} />
                <Text style={[typography.body, { color: colors.text, marginLeft: 10 }]}>{reminderLabel(offset, t)}</Text>
              </View>
            ))
          )}
        </Section>

        <Section>
          <View style={[styles.infoRow, { padding: spacing.md }]}>
            <Ionicons name="repeat" size={18} color={colors.secondary} />
            <Text style={[typography.body, { color: colors.text, marginLeft: 10 }]}>{t(`events.repeat.${event.repeat}`)}</Text>
          </View>
        </Section>

        {event.note ? (
          <Section title={t('events.noteLabel')}>
            <View style={{ padding: spacing.md }}>
              <Text style={[typography.body, { color: colors.text }]}>{event.note}</Text>
            </View>
          </Section>
        ) : null}

        <View style={styles.buttonRow}>
          <Button label={t('events.share')} variant="secondary" onPress={handleShare} style={{ flex: 1, marginRight: 8 }} />
          <Button
            label={t('events.addWidget')}
            onPress={() => router.push('/widgets')}
            style={{ flex: 1, marginLeft: 8 }}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { paddingBottom: 24 },
  heroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroHeaderRight: { flexDirection: 'row', alignItems: 'center' },
  heroBody: { marginTop: 8, gap: 10 },
  heroTitle: { color: '#fff', fontSize: 26, fontWeight: '700' },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  buttonRow: { flexDirection: 'row', marginTop: 8 },
});
