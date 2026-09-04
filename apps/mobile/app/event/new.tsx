import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { createEvent } from '../../src/storage/events';
import type { EventCategory, RepeatRule } from '../../src/types/event';

const CATEGORIES: EventCategory[] = ['personal', 'work', 'travel', 'finance', 'health', 'other'];
const REPEATS: RepeatRule[] = ['none', 'yearly', 'monthly', 'weekly'];

export default function NewEventScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => new Date(Date.now() + 60 * 60 * 1000));
  const [category, setCategory] = useState<EventCategory>('personal');
  const [repeat, setRepeat] = useState<RepeatRule>('none');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const canSave = title.trim().length > 0 && !saving;

  async function handleSave() {
    if (!canSave) return;
    setSaving(true);
    await createEvent({
      title: title.trim(),
      dateTimeISO: date.toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      category,
      repeat,
      note: note.trim() || undefined,
    });
    router.back();
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>{t('events.titleLabel')}</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} autoFocus />

      <Text style={styles.label}>{t('events.dateLabel')}</Text>
      <DateTimePicker
        value={date}
        mode="datetime"
        display={Platform.OS === 'ios' ? 'inline' : 'default'}
        onChange={(_, selected) => selected && setDate(selected)}
      />

      <Text style={styles.label}>{t('events.categoryLabel')}</Text>
      <View style={styles.chipRow}>
        {CATEGORIES.map((c) => (
          <Pressable
            key={c}
            style={[styles.chip, category === c && styles.chipSelected]}
            onPress={() => setCategory(c)}
          >
            <Text style={[styles.chipText, category === c && styles.chipTextSelected]}>
              {t(`events.category.${c}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>{t('events.repeatLabel')}</Text>
      <View style={styles.chipRow}>
        {REPEATS.map((r) => (
          <Pressable
            key={r}
            style={[styles.chip, repeat === r && styles.chipSelected]}
            onPress={() => setRepeat(r)}
          >
            <Text style={[styles.chipText, repeat === r && styles.chipTextSelected]}>
              {t(`events.repeat.${r}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>{t('events.noteLabel')}</Text>
      <TextInput style={[styles.input, styles.multiline]} value={note} onChangeText={setNote} multiline />

      <Pressable
        style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={!canSave}
      >
        <Text style={styles.saveButtonText}>{t('events.save')}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, paddingBottom: 48 },
  label: { fontSize: 13, fontWeight: '600', color: '#666', marginTop: 20, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F7',
  },
  chipSelected: { backgroundColor: '#111' },
  chipText: { fontSize: 14, color: '#333' },
  chipTextSelected: { color: '#fff' },
  saveButton: {
    marginTop: 32,
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#111',
    alignItems: 'center',
  },
  saveButtonDisabled: { opacity: 0.4 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
