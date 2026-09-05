import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useRouter } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { EventHeroCard } from '../components/EventHeroCard';
import { EventIcon } from '../components/EventIcon';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Section } from '../components/ui/Section';
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
type SectionKey = 'schedule' | 'reminders' | 'appearance' | 'advanced';

function timezoneAbbrev(tz: string): string {
  try {
    const part = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'short' })
      .formatToParts(new Date())
      .find((p) => p.type === 'timeZoneName');
    return part?.value ?? tz;
  } catch {
    return tz;
  }
}

interface AccordionRowProps {
  title: string;
  summary: string;
  expanded: boolean;
  onPress: () => void;
  children: ReactNode;
}

// One collapsible row inside the grouped card below Basics — collapsed
// shows title + a one-line summary, expanded swaps the summary for the
// editable content. Matches the approved "single scrollable form" layout
// (not a paginated wizard) — see UI feedback.
function AccordionRow({ title, summary, expanded, onPress, children }: AccordionRowProps) {
  const { colors, spacing, typography } = useTheme();
  return (
    <View style={{ padding: spacing.md }}>
      <Pressable onPress={onPress} style={styles.accordionHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[typography.bodyStrong, { color: colors.text }]}>{title}</Text>
          {!expanded ? <Text style={[typography.caption, { color: colors.secondary, marginTop: 2 }]}>{summary}</Text> : null}
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.secondary} />
      </Pressable>
      {expanded ? <View style={{ marginTop: spacing.sm + 4 }}>{children}</View> : null}
    </View>
  );
}

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

  const [expanded, setExpanded] = useState<SectionKey | null>(null);
  const [accentOpen, setAccentOpen] = useState(false);
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
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const draftEvent: PurEvent = {
    id: 'draft',
    title: title.trim() || 'Event',
    dateTimeISO: date.toISOString(),
    timezone,
    category,
    accentColor,
    repeat,
    reminders,
    note: note.trim() || undefined,
    createdAt: '',
    updatedAt: '',
  };

  function toggle(key: SectionKey) {
    setExpanded((prev) => (prev === key ? null : key));
  }

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

  async function handleSave() {
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
      timezone,
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

  const scheduleSummary = `${dayjs(date).format('MMM D, YYYY • h:mm A')} • ${timezoneAbbrev(timezone)}`;
  const remindersSummary =
    reminders.length === 0 ? t('events.noReminders') : `${reminders.length} ${t('events.remindersLabel').toLowerCase()}`;
  const appearanceSummary = `${t(`events.category.${category}`)} • ${accentColor}`;
  const advancedSummary = note.trim() ? `${t(`events.repeat.${repeat}`)}, note added` : t(`events.repeat.${repeat}`);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { padding: spacing.md }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
        <Text style={[typography.bodyStrong, { color: colors.text }]}>
          {mode === 'create' ? t('events.newEventTitle') : t('events.editEventTitle')}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={[styles.stepper, { paddingHorizontal: spacing.md, marginBottom: spacing.sm }]}>
        <View style={[styles.stepperLine, { backgroundColor: colors.outline }]} />
        {STEPS.map((key, i) => {
          const sectionKey = (['schedule', 'reminders', 'appearance'][i - 1] ?? null) as SectionKey | null;
          const active = i === 0 ? expanded === null : expanded === sectionKey;
          return (
            <Pressable key={key} style={styles.stepItem} onPress={() => sectionKey && setExpanded(sectionKey)}>
              <View style={[styles.stepCircle, { backgroundColor: active ? colors.primary : colors.surfaceAlt, borderRadius: 999 }]}>
                <Text style={{ color: active ? colors.onPrimary : colors.secondary, fontSize: 12, fontWeight: '600' }}>{i + 1}</Text>
              </View>
              <Text style={[typography.caption, { color: active ? colors.text : colors.secondary, marginTop: 4 }]}>
                {t(`events.${key}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.md, paddingBottom: 48 }}>
        {/* Basics — always visible, matches the approved layout */}
        <Card>
          <Text style={[typography.bodyStrong, { color: colors.text, marginBottom: spacing.md }]}>{t('events.basicsHeading')}</Text>

          <Text style={[typography.label, { color: colors.secondary, marginBottom: 8 }]}>{t('events.eventNameLabel')}</Text>
          <TextInput
            style={[styles.input, { borderColor: colors.outline, color: colors.text, borderRadius: radius.md }]}
            value={title}
            onChangeText={setTitle}
            autoFocus
            placeholderTextColor={colors.secondary}
          />

          <Text style={[typography.label, { color: colors.secondary, marginTop: 20, marginBottom: 8 }]}>{t('events.accentColorLabel')}</Text>
          <Pressable
            onPress={() => setAccentOpen((v) => !v)}
            style={[styles.dropdownField, { borderColor: colors.outline, borderRadius: radius.md }]}
          >
            <View style={[styles.dot, { backgroundColor: accents[accentColor] }]} />
            <Text style={[typography.body, { color: colors.text, flex: 1, marginLeft: 10, textTransform: 'capitalize' }]}>
              {accentColor}
            </Text>
            <Ionicons name={accentOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.secondary} />
          </Pressable>
          {accentOpen ? (
            <View style={[styles.chipRow, { marginTop: 12 }]}>
              {ACCENT_KEYS.map((key) => {
                const selected = accentColor === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => {
                      setAccentColor(key);
                      setAccentOpen(false);
                    }}
                    style={[
                      styles.swatch,
                      elevation.e1,
                      { backgroundColor: accents[key], borderWidth: selected ? 3 : 0, borderColor: colors.surface },
                    ]}
                  >
                    {selected ? <Ionicons name="checkmark" size={18} color="#fff" /> : null}
                  </Pressable>
                );
              })}
            </View>
          ) : null}

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
                    { backgroundColor: selected ? colors.primary : `${color}1F`, borderRadius: radius.md, opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  <EventIcon category={c} size={52} />
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
        </Card>

        {/* Schedule / Reminders / Appearance / Advanced — grouped accordion card */}
        <View style={{ marginTop: spacing.lg }}>
          <Section>
            <AccordionRow
              title={t('events.stepSchedule')}
              summary={scheduleSummary}
              expanded={expanded === 'schedule'}
              onPress={() => toggle('schedule')}
            >
              <DateTimePicker
                value={date}
                mode="datetime"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onChange={(_, selected) => selected && setDate(selected)}
              />
            </AccordionRow>

            <AccordionRow
              title={t('events.stepReminders')}
              summary={remindersSummary}
              expanded={expanded === 'reminders'}
              onPress={() => toggle('reminders')}
            >
              {reminders.map((offset) => (
                <View
                  key={offset}
                  style={[styles.reminderRow, { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.sm + 4 }]}
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
            </AccordionRow>

            <AccordionRow
              title={t('events.stepAppearance')}
              summary={appearanceSummary}
              expanded={expanded === 'appearance'}
              onPress={() => toggle('appearance')}
            >
              <EventHeroCard event={draftEvent} height={140} />
              {!isPro ? (
                <Pressable
                  onPress={() => router.push('/upgrade')}
                  style={[styles.proNote, { backgroundColor: colors.surfaceAlt, borderRadius: radius.md }]}
                >
                  <Ionicons name="lock-closed" size={14} color={colors.secondary} />
                  <Text style={[typography.caption, { color: colors.secondary, marginLeft: 6 }]}>{t('widgets.proNote')}</Text>
                </Pressable>
              ) : null}
            </AccordionRow>

            <AccordionRow
              title={t('events.stepAdvanced')}
              summary={advancedSummary}
              expanded={expanded === 'advanced'}
              onPress={() => toggle('advanced')}
            >
              <Text style={[typography.label, { color: colors.secondary, marginBottom: 8 }]}>{t('events.repeatLabel')}</Text>
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

              <Text style={[typography.label, { color: colors.secondary, marginTop: 16, marginBottom: 8 }]}>{t('events.noteLabel')}</Text>
              <TextInput
                style={[styles.input, styles.multiline, { borderColor: colors.outline, color: colors.text, borderRadius: radius.md }]}
                placeholder={t('events.noteLabel')}
                placeholderTextColor={colors.secondary}
                value={note}
                onChangeText={setNote}
                multiline
              />
            </AccordionRow>
          </Section>
        </View>
      </ScrollView>

      <View style={{ padding: spacing.md }}>
        <Button label={mode === 'create' ? t('events.createEvent') : t('events.save')} onPress={handleSave} disabled={!canSave} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stepper: { flexDirection: 'row', justifyContent: 'space-between', position: 'relative' },
  stepperLine: { position: 'absolute', top: 13, left: '12.5%', right: '12.5%', height: 2, zIndex: -1 },
  stepItem: { alignItems: 'center', flex: 1 },
  stepCircle: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center' },
  input: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8 },
  swatch: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  dropdownField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dot: { width: 14, height: 14, borderRadius: 7 },
  categoryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  categoryChip: { width: '47%', flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 10 },
  accordionHeader: { flexDirection: 'row', alignItems: 'center' },
  reminderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  addReminder: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, padding: 12, borderStyle: 'dashed' },
  proNote: { flexDirection: 'row', alignItems: 'center', padding: 10, marginTop: 12 },
});
