import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CountdownText } from '../../src/components/CountdownText';
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
    await deleteEvent(event!.id);
    router.back();
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{event.title}</Text>
      <CountdownText targetISO={event.dateTimeISO} style={styles.countdown} />
      <Text style={styles.meta}>{t(`events.category.${event.category}`)}</Text>
      <Text style={styles.meta}>{t(`events.repeat.${event.repeat}`)}</Text>
      {event.note ? <Text style={styles.note}>{event.note}</Text> : null}

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
  deleteButton: {
    marginTop: 40,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
  },
  deleteButtonText: { color: '#B91C1C', fontSize: 16, fontWeight: '600' },
});
