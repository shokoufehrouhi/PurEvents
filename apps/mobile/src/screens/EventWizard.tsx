import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { EventHeroCard } from '../components/EventHeroCard';
import { EventIcon } from '../components/EventIcon';
import { Button } from '../components/ui/Button';
import { scheduleRemindersForEvent } from '../notifications';
import { createEvent, getEvent, listEvents, updateEvent } from '../storage/events';
import { usePro, FREE_LIMITS } from '../subscription';
import { usePreferences, useTheme } from '../theme/PreferencesContext';
import { ACCENT_KEYS, accents, elevation, type AccentKey } from '../theme/tokens';
import { getCategoryIcon } from '../theme/icons';
import type { EventCategory, PurEvent, RepeatRule } from '../types/event';
import { PRESET_REMINDER_OFFSETS, reminderLabel } from '../utils/reminders';

const CATEGORIES: EventCategory[] = ['personal', 'work', 'travel', 'finance', 'health', 'other'];
const REPEATS: RepeatRule[] = ['none', 'yearly', 'monthly', 'weekly'];
const STEPS = ['stepBasics', 'stepSchedule', 'stepReminders', 'stepAppearance'] as const;

interface Props {
  mode: 'create' | 'edit';
  eventId?: string;
}

export function EventWizard({ mode, eventId }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors, spacing, radius, typography } = useTheme();
  const { prefs } = usePreferences();
  const { isPro } = usePro();

  const [step, setStep] = useState(0);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => new Date(Date.now() + 60 * 60 * 1000));
  const [category, setCategory] = useState<EventCategory>('personal');
  const [accentColor, setAccentColor] = useState<AccentKey>('coral');
  const [repeat, setRepeat] = useState<RepeatRule>('none');
  const [reminders, setReminders] = useState<number[]>(prefs.defaultReminderOffsets);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (mode === 'edit' && eventId) {
      getEvent(eventId).then((e) => {
        if (!e) return;
        setTitle(e.title);
        setDate(new Date(e.dateTimeISO));
        setCategory(e.category);
        setAccentColor(e.accentColor);
        setRepeat(e.repeat);
        setReminders(e.reminders);
        setNote(e.note ?? '');
      });
    }
  }, [mode, eventId]);

  const canSave = title.trim().length > 0 && !saving;
  const draftEvent: PurEvent = {
    id: 'draft',
    title: title.trim() || 'Event',
    dateTimeISO: date.toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    category,
    accentColor,
    repeat,
    reminders,
    note: note.trim() || undefined,
    createdAt: '',
    updatedAt: '',
  };

  function addReminder() {
    if (!isPro && reminders.length >= FREE_LIMITS.maxRemindersPerEvent) {
      router.push('/paywall');
      return;
    }
    const next = PRESET_REMINDER_OFFSETS.find((o) => !reminders.includes(o));
    if (next !== undefined) setReminders([...reminders, next].sort((a, b) => a - b));
  }

  function removeReminder(offset: number) {
    setReminders(reminders.filter((r) => r !== offset));
  }

  async function handlePrimary() {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      return;
    }
    if (!canSave) return;

    if (mode === 'create') {
      const existing = await listEvents();
      if (!isPro && existing.length >= FREE_LIMITS.maxActiveEvents) {
        router.push('/paywall');
        return;
      }
    }

    setSaving(true);
    const input = {
      title: title.trim(),
      dateTimeISO: date.toISOString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      category,
      accentColor,
      repeat,
      reminders,
      note: note.trim() || undefined,
    };

    const saved = mode === 'edit' && eventId ? await updateEvent(eventId, input) : await createEvent(input);
    if (saved) await scheduleRemindersForEvent(saved);
    router.back();
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { padding: spacing.md }]}>
        <Pressable onPress={() => (step === 0 ? router.back() : setStep(step - 1))} hitSlop={12}>
          <Ionicons name={step === 0 ? 'close' : 'chevron-back'} size={24} color={colors.text} />
        </Pressable>
        <Text style={[typography.bodyStrong, { color: colors.text }]}>
          {mode === 'create' ? t('events.add') : t('events.save')}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={[styles.stepper, { paddingHorizontal: spacing.md, marginBottom: spacing.sm }]}>
        {STEPS.map((key, i) => (
          <View key={key} style={styles.stepItem}>
            <View
              style={[
                styles.stepCircle,
                { backgroundColor: i <= step ? colors.primary : colors.surfaceAlt, borderRadius: 999 },
              ]}
            >
              <Text style={{ color: i <= step ? colors.onPrimary : colors.secondary, fontSize: 12, fontWeight: '600' }}>
                {i + 1}
              </Text>
            </View>
            <Text style={[typography.caption, { color: i === step ? colors.text : colors.secondary, marginTop: 4 }]}>
              {t(`events.${key}`)}
            </Text>
          </View>
        ))}
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 48 }}>
        {step === 0 && (
          <>
            <Text style={[typography.label, { color: colors.secondary, marginBottom: 8 }]}>{t('events.eventNameLabel')}</Text>
            <TextInput
              style={[styles.input, { borderColor: colors.outline, color: colors.text, borderRadius: radius.md }]}
              value={title}
              onChangeText={setTitle}
              autoFocus
              placeholderTextColor={colors.secondary}
            />

            <Text style={[typography.label, { color: colors.secondary, marginTop: 20, marginBottom: 8 }]}>{t('events.accentColorLabel')}</Text>
            <View style={styles.chipRow}>
              {ACCENT_KEYS.map((key) => {
                const selected = accentColor === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => setAccentColor(key)}
                    style={[
                      styles.swatch,
                      elevation.e1,
                      {
                        backgroundColor: accents[key],
                        borderWidth: selected ? 3 : 0,
                        borderColor: colors.surface,
                      },
                    ]}
                  >
                    {selected ? <Ionicons name="checkmark" size={18} color="#fff" /> : null}
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.categoryHeader}>
              <Text style={[typography.label, { color: colors.secondary, marginTop: 20, marginBottom: 8 }]}>{t('events.categoryLabel')}</Text>
              <Text style={[typography.caption, { color: colors.secondary, marginTop: 20 }]}>{t('events.chooseOne')}</Text>
            </View>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((c) => {
                const selected = category === c;
                const { color } = getCategoryIcon(c);
                return (
                  <Pressable
                    key={c}
                    onPress={() => setCategory(c)}
                    style={({ pressed }) => [
                      styles.categoryChip,
                      elevation.e1,
                      {
                        backgroundColor: selected ? colors.primary : `${color}1F`,
                        borderRadius: radius.md,
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                  >
                    <EventIcon category={c} size={32} />
                    <Text
                      style={[typography.bodyStrong, { color: selected ? colors.onPrimary : colors.text, flex: 1, marginLeft: 10 }]}
                      numberOfLines={1}
                    >
                      {t(`events.category.${c}`)}
                    </Text>
                    {selected ? <Ionicons name="checkmark-circle" size={20} color={colors.onPrimary} /> : null}
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {step === 1 && (
          <>
            <Text style={[typography.label, { color: colors.secondary, marginBottom: 8 }]}>{t('events.dateLabel')}</Text>
            <DateTimePicker
              value={date}
              mode="datetime"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onChange={(_, selected) => selected && setDate(selected)}
            />

            <Text style={[typography.label, { color: colors.secondary, marginTop: 20, marginBottom: 8 }]}>{t('events.repeatLabel')}</Text>
            <View style={styles.chipRow}>
              {REPEATS.map((r) => (
                <Pressable
                  key={r}
                  onPress={() => setRepeat(r)}
                  style={[styles.chip, { backgroundColor: repeat === r ? colors.primary : colors.surfaceAlt, borderRadius: radius.pill }]}
                >
                  <Text style={{ color: repeat === r ? colors.onPrimary : colors.text }}>{t(`events.repeat.${r}`)}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {step === 2 && (
          <>
            <Text style={[typography.label, { color: colors.secondary, marginBottom: 8 }]}>{t('events.remindersLabel')}</Text>
            {reminders.map((offset) => (
              <View
                key={offset}
                style={[styles.reminderRow, { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.sm + 4 }]}
              >
                <Ionicons name="notifications-outline" size={18} color={colors.secondary} />
                <Text style={[typography.body, { color: colors.text, flex: 1, marginLeft: 10 }]}>{reminderLabel(offset, t)}</Text>
                <Pressable onPress={() => removeReminder(offset)} hitSlop={8}>
                  <Ionicons name="close-circle" size={20} color={colors.secondary} />
                </Pressable>
              </View>
            ))}
            <Pressable onPress={addReminder} style={[styles.addReminder, { borderColor: colors.primary, borderRadius: radius.md }]}>
              <Ionicons name="add" size={18} color={colors.primary} />
              <Text style={[typography.bodyStrong, { color: colors.primary, marginLeft: 6 }]}>{t('events.reminderAdd')}</Text>
              {!isPro && reminders.length >= FREE_LIMITS.maxRemindersPerEvent ? (
                <Ionicons name="lock-closed" size={14} color={colors.secondary} style={{ marginLeft: 6 }} />
              ) : null}
            </Pressable>
          </>
        )}

        {step === 3 && (
          <>
            <EventHeroCard event={draftEvent} height={140} />
            <TextInput
              style={[
                styles.input,
                styles.multiline,
                { borderColor: colors.outline, color: colors.text, borderRadius: radius.md, marginTop: 20 },
              ]}
              placeholder={t('events.noteLabel')}
              placeholderTextColor={colors.secondary}
              value={note}
              onChangeText={setNote}
              multiline
            />
            {!isPro ? (
              <Pressable onPress={() => router.push('/upgrade')} style={[styles.proNote, { backgroundColor: colors.surfaceAlt, borderRadius: radius.md }]}>
                <Ionicons name="lock-closed" size={14} color={colors.secondary} />
                <Text style={[typography.caption, { color: colors.secondary, marginLeft: 6 }]}>{t('widgets.proNote')}</Text>
              </Pressable>
            ) : null}
          </>
        )}
      </ScrollView>

      <View style={{ padding: spacing.md }}>
        <Button
          label={step < STEPS.length - 1 ? t('events.next') : mode === 'create' ? t('events.createEvent') : t('events.save')}
          onPress={handlePrimary}
          disabled={!canSave}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepper: { flexDirection: 'row', justifyContent: 'space-between' },
  stepItem: { alignItems: 'center', flex: 1 },
  stepCircle: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center' },
  input: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8 },
  swatch: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  categoryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categoryChip: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  reminderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  addReminder: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, padding: 12, borderStyle: 'dashed' },
  proNote: { flexDirection: 'row', alignItems: 'center', padding: 10, marginTop: 12 },
});
