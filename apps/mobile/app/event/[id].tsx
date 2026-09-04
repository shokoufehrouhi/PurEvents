import dayjs from 'dayjs';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { CountdownText } from '../../src/components/CountdownText';
import { cancelRemindersForEvent } from '../../src/notifications';
import { deleteEvent, getEvent } from '../../src/storage/events';
import type { PurEvent } from '../../src/types/event';

export default function EventDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [event, setEvent] = useState<PurEvent | null>(null);

  useEffect(() => {
    if (id) getEvent(id).then((e) => setEvent(e ?? null));
  }, [id]);

  if (!event) return null;

  async function handleDelete() {
    await cancelRemindersForEvent(event!.id);
    await deleteEvent(event!.id);
    router.back();
  }

  // MVP share: plain text via the native Share Sheet/Intent, per
  // docs/PROJECT.md §3.5. The Pro graphic-card version comes later.
  async function handleShare() {
    await Share.share({
      message: `${event!.title} — ${dayjs(event!.dateTimeISO).format('YYYY-MM-DD HH:mm')}`,
    });
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{event.title}</Text>
      <CountdownText targetISO={event.dateTimeISO} style={styles.countdown} />
      <Text style={styles.meta}>{t(`events.category.${event.category}`)}</Text>
      <Text style={styles.meta}>{t(`events.repeat.${event.repeat}`)}</Text>
      {event.note ? <Text style={styles.note}>{event.note}</Text> : null}

      <Pressable style={styles.shareButton} onPress={handleShare}>
        <Text style={styles.shareButtonText}>{t('events.share')}</Text>
      </Pressable>
      <Pressable style={styles.deleteButton} onPress={handleDelete}>
        <Text style={styles.deleteButtonText}>{t('events.delete')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 20 },
  title: { fontSize: 24, fontWeight: '700' },
  countdown: { fontSize: 20, marginTop: 12, color: '#333' },
  meta: { fontSize: 15, marginTop: 16, color: '#666' },
  note: { fontSize: 15, marginTop: 16, color: '#333' },
  shareButton: {
    marginTop: 40,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#111',
    alignItems: 'center',
  },
  shareButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  deleteButton: {
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
  },
  deleteButtonText: { color: '#B91C1C', fontSize: 16, fontWeight: '600' },
});
