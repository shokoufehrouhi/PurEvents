import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { EventHeroCard } from '../components/EventHeroCard';
import { Button } from '../components/ui/Button';
import { scheduleRemindersForEvent } from '../notifications';
import { createEvent, getEvent, listEvents, updateEvent } from '../storage/events';
import { usePro, FREE_LIMITS } from '../subscription';
import { usePreferences, useTheme } from '../theme/PreferencesContext';
import { ACCENT_KEYS, accents, type AccentKey } from '../theme/tokens';
import type { EventCategory, PurEvent, RepeatRule } from '../types/event';
import { PRESET_REMINDER_OFFSETS, reminderLabel } from '../utils/reminders';

const CATEGORIES: EventCategory[] = ['personal', 'work', 'travel', 'finance', 'health', 'other'];
const REPEATS: RepeatRule[] = ['none', 'yearly', 'monthly', 'weekly'];
const ICONS = ['🎉', '🎂', '✈️', '💼', '💰', '❤️', '🎓', '💍', '🚀', '📌'];
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
  const [icon, setIcon] = useState(ICONS[0]);
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
        setIcon(e.icon);
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
    icon,
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
      icon,
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
              {ACCENT_KEYS.map((key) => (
                <Pressable
                  key={key}
                  onPress={() => setAccentColor(key)}
                  style={[
                    styles.swatch,
                    { backgroundColor: accents[key], borderWidth: accentColor === key ? 3 : 0, borderColor: colors.text },
                  ]}
                />
              ))}
            </View>

            <Text style={[typography.label, { color: colors.secondary, marginTop: 20, marginBottom: 8 }]}>{t('events.iconLabel')}</Text>
            <View style={styles.chipRow}>
              {ICONS.map((e) => (
                <Pressable
                  key={e}
                  onPress={() => setIcon(e)}
                  style={[styles.iconChip, { backgroundColor: icon === e ? colors.primary : colors.surfaceAlt, borderRadius: radius.md }]}
                >
                  <Text style={{ fontSize: 18 }}>{e}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[typography.label, { color: colors.secondary, marginTop: 20, marginBottom: 8 }]}>{t('events.categoryLabel')}</Text>
            <View style={styles.chipRow}>
              {CATEGORIES.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setCategory(c)}
                  style={[styles.chip, { backgroundColor: category === c ? colors.primary : colors.surfaceAlt, borderRadius: radius.pill }]}
                >
                  <Text style={{ color: category === c ? colors.onPrimary : colors.text }}>{t(`events.category.${c}`)}</Text>
                </Pressable>
              ))}
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
  iconChip: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  swatch: { width: 32, height: 32, borderRadius: 16 },
  reminderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  addReminder: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, padding: 12, borderStyle: 'dashed' },
  proNote: { flexDirection: 'row', alignItems: 'center', padding: 10, marginTop: 12 },
});
