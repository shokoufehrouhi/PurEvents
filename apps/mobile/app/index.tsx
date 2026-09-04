import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { CountdownText } from '../src/components/CountdownText';
import { listEvents } from '../src/storage/events';
import type { PurEvent } from '../src/types/event';

export default function EventListScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [events, setEvents] = useState<PurEvent[]>([]);

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

  return (
    <View style={styles.container}>
      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        contentContainerStyle={events.length === 0 && styles.emptyContainer}
        ListEmptyComponent={<Text style={styles.emptyText}>{t('events.empty')}</Text>}
        renderItem={({ item }) => (
          <Pressable style={styles.card} onPress={() => router.push(`/event/${item.id}`)}>
            <Text style={styles.title}>{item.title}</Text>
            <CountdownText targetISO={item.dateTimeISO} style={styles.countdown} />
          </Pressable>
        )}
      />
      <Pressable style={styles.addButton} onPress={() => router.push('/event/new')}>
        <Text style={styles.addButtonText}>{t('events.add')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#666', fontSize: 16, textAlign: 'center', paddingHorizontal: 32 },
  card: {
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: '#F5F5F7',
  },
  title: { fontSize: 17, fontWeight: '600' },
  countdown: { marginTop: 6, fontSize: 15, color: '#444' },
  addButton: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#111',
    alignItems: 'center',
  },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
