import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { useRouter } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EventHeroCard } from '../components/EventHeroCard';
import { EventIcon } from '../components/EventIcon';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Section } from '../components/ui/Section';
import { scheduleRemindersForEvent } from '../notifications';
import { createEvent, getEvent, listEvents, updateEvent } from '../storage/events';
import { usePro, FREE_LIMITS } from '../subscription';
import { CARD_THEME_KEYS, CARD_THEMES } from '../theme/cardThemes';
import { REPEAT_STYLES } from '../theme/repeatStyles';
import { usePreferences, useTheme } from '../theme/PreferencesContext';
import { ACCENT_KEYS, accents, elevation, type AccentKey } from '../theme/tokens';
import type { CardTheme, EventCategory, PurEvent, RepeatRule } from '../types/event';
import { formatCivilDateFull } from '../utils/calendars';
import { awaitPick } from '../utils/pickerBridge';
import { PRESET_REMINDER_OFFSETS, reminderLabel } from '../utils/reminders';

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
  const insets = useSafeAreaInsets();
  const { prefs } = usePreferences();
  const { isPro } = usePro();

  const [expanded, setExpanded] = useState<SectionKey | null>(null);
  const [accentOpen, setAccentOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => new Date());
  const [category, setCategory] = useState<EventCategory>('personal');
  const [accentColor, setAccentColor] = useState<AccentKey>('coral');
  const [cardTheme, setCardTheme] = useState<CardTheme>('color');
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
        setCardTheme(e.cardTheme);
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
    cardTheme,
    repeat,
    reminders,
    note: note.trim() || undefined,
    createdAt: '',
    updatedAt: '',
  };

  function toggle(key: SectionKey) {
    setExpanded((prev) => (prev === key ? null : key));
  }

  async function openCategoryPicker() {
    router.push({ pathname: '/event/category-picker', params: { current: category } });
    const picked = await awaitPick();
    setCategory(picked as EventCategory);
  }

  async function openRepeatPicker() {
    router.push({ pathname: '/event/repeat-picker', params: { current: repeat, date: date.toISOString() } });
    const picked = await awaitPick();
    setRepeat(picked as RepeatRule);
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
      cardTheme,
      repeat,
      reminders,
      note: note.trim() || undefined,
    };

    const saved = mode === 'edit' && eventId ? await updateEvent(eventId, input) : await createEvent(input);
    if (saved) await scheduleRemindersForEvent(saved);
    router.back();
  }

  const scheduleSummary = `${formatCivilDateFull(date.toISOString(), prefs.calendar)} • ${dayjs(date).format('h:mm A')} • ${timezoneAbbrev(timezone)}`;
  const remindersSummary =
    reminders.length === 0 ? t('events.noReminders') : `${reminders.length} ${t('events.remindersLabel').toLowerCase()}`;
  const appearanceSummary = t(`events.cardTheme.${cardTheme}`);
  const advancedSummary = note.trim() ? `${t(`events.repeat.${repeat}`)}, note added` : t(`events.repeat.${repeat}`);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { padding: spacing.md, paddingTop: insets.top + spacing.md }]}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="close" size={24} color={colors.text} />
        </Pressable>
        <Text style={[typography.bodyStrong, { color: colors.text }]}>
          {mode === 'create' ? t('events.newEventTitle') : t('events.editEventTitle')}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: spacing.md, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
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

          <Text style={[typography.label, { color: colors.secondary, marginTop: 20, marginBottom: 8 }]}>{t('events.categoryLabel')}</Text>
          <Pressable
            onPress={openCategoryPicker}
            style={[styles.dropdownField, { borderColor: colors.outline, borderRadius: radius.md }]}
          >
            <EventIcon category={category} size={24} />
            <Text style={[typography.body, { color: colors.text, flex: 1, marginLeft: 10 }]}>{t(`events.category.${category}`)}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.secondary} />
          </Pressable>
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
                display={Platform.OS === 'ios' ? 'compact' : 'default'}
                locale={
                  prefs.calendar === 'persian'
                    ? 'fa_IR@calendar=persian'
                    : prefs.calendar === 'islamic'
                      ? 'ar_SA@calendar=islamic'
                      : undefined
                }
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

              <Text style={[typography.label, { color: colors.secondary, marginTop: 16, marginBottom: 8 }]}>
                {t('events.cardThemeLabel')}
              </Text>
              <View style={styles.themeRow}>
                {CARD_THEME_KEYS.map((key) => {
                  const preset = CARD_THEMES[key];
                  const selected = cardTheme === key;
                  return (
                    <Pressable key={key} style={styles.themeOption} onPress={() => setCardTheme(key)}>
                      <View
                        style={[
                          styles.themeSwatch,
                          elevation.e1,
                          {
                            backgroundColor: preset.background ?? accents[accentColor],
                            borderRadius: radius.md,
                            borderWidth: selected ? 2 : 0,
                            borderColor: colors.primary,
                          },
                        ]}
                      >
                        <EventIcon category={category} size={22} variant={preset.iconVariant} />
                        <Text style={{ color: preset.text, fontSize: 11, fontWeight: '600', marginTop: 4 }} numberOfLines={1}>
                          {title.trim() || 'Event'}
                        </Text>
                      </View>
                      <Text style={[typography.caption, { color: selected ? colors.primary : colors.secondary, marginTop: 6, fontWeight: selected ? '700' : '400' }]}>
                        {t(`events.cardTheme.${key}`)}
                      </Text>
                      <View style={[styles.radio, { borderColor: selected ? colors.primary : colors.outline }]}>
                        {selected ? <View style={[styles.radioDot, { backgroundColor: colors.primary }]} /> : null}
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              {!isPro ? (
                <Pressable
                  onPress={() => router.push('/upgrade')}
                  style={[styles.proNote, { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, marginTop: 16 }]}
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
              <Pressable
                onPress={openRepeatPicker}
                style={[styles.dropdownField, { borderColor: colors.outline, borderRadius: radius.md }]}
              >
                <Ionicons name={REPEAT_STYLES[repeat].icon} size={18} color={REPEAT_STYLES[repeat].color} />
                <Text style={[typography.body, { color: colors.text, flex: 1, marginLeft: 10 }]}>{t(`events.repeat.${repeat}`)}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.secondary} />
              </Pressable>

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
  input: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16 },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  swatch: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  dropdownField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dot: { width: 14, height: 14, borderRadius: 7 },
  accordionHeader: { flexDirection: 'row', alignItems: 'center' },
  reminderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  addReminder: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, padding: 12, borderStyle: 'dashed' },
  proNote: { flexDirection: 'row', alignItems: 'center', padding: 10, marginTop: 12 },
  themeRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  themeOption: { flex: 1, alignItems: 'center' },
  themeSwatch: { width: '100%', aspectRatio: 1.1, alignItems: 'center', justifyContent: 'center' },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
});
