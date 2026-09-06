import { useTranslation } from 'react-i18next';
import { ImageBackground, StyleSheet, Text, View } from 'react-native';

import { usePreferences } from '../theme/PreferencesContext';
import { CARD_THEMES } from '../theme/cardThemes';
import { accents } from '../theme/tokens';
import type { PurEvent } from '../types/event';
import { formatEventDateLine, formatTodayLine } from '../utils/eventDate';
import { getNextOccurrenceISO } from '../utils/recurrence';
import { EventIcon } from './EventIcon';
import { HeroCountdown } from './HeroCountdown';

interface Props {
  // Optional so the top-of-Events-tab banner can render even with zero
  // events (falls back to a generic "Today" caption/date, no
  // title/category/countdown — see the no-event branch below).
  event?: PurEvent;
  height?: number;
  // When set, renders a photo background (with a dark scrim for text
  // legibility) instead of the event's own Clean/Color/Dark theme — used
  // only for the "current/next event" card at the top of the Events tab,
  // showing a photo of the user's own current city/country, not the
  // event's cardTheme. Leave unset everywhere else (event detail, etc.).
  photoUri?: string;
}

// Hero card for an event — one of three flat presets (Clean/Color/Dark, see
// src/theme/cardThemes.ts and the Appearance step of the wizard). 'color'
// fills with the event's own accentColor; the other two are fixed colors
// independent of accent/category. MVP has no cover-photo picker yet — see
// docs/PROJECT.md follow-ups.
export function EventHeroCard({ event, height = 170, photoUri }: Props) {
  const { t, i18n } = useTranslation();
  const { radius, spacing, prefs } = usePreferences();
  const preset = event ? CARD_THEMES[event.cardTheme] ?? CARD_THEMES.color : CARD_THEMES.color;
  const background = preset.background ?? accents[event?.accentColor ?? 'violet'] ?? accents.violet;
  const nextOccurrenceISO = event ? getNextOccurrenceISO(event.dateTimeISO, event.repeat) : null;

  // A photo's own brightness varies, so force legible white-on-scrim text
  // instead of trusting whatever the event's own theme picked.
  const textColor = photoUri ? '#FFFFFF' : preset.text;
  const secondaryColor = photoUri ? 'rgba(255,255,255,0.85)' : preset.secondary;

  const caption = photoUri ? (
    <Text style={styles.heroCaption} numberOfLines={1}>
      {t('events.heroCaption')}
    </Text>
  ) : null;

  const content =
    event && nextOccurrenceISO ? (
      <>
        {caption}
        <View style={styles.metaRow}>
          <View style={styles.categoryRow}>
            <EventIcon category={event.category} size={22} variant={photoUri ? 'white' : preset.iconVariant} />
            <Text style={[styles.categoryText, { color: textColor }]} numberOfLines={1}>
              {t(`events.category.${event.category}`)}
            </Text>
          </View>
          <Text style={[styles.repeatText, { color: secondaryColor }]} numberOfLines={1}>
            {t(`events.repeat.${event.repeat}`)}
          </Text>
        </View>

        <View style={styles.bottom}>
          <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>
            {event.title}
          </Text>
          <Text style={[styles.dateLine, { color: secondaryColor }]} numberOfLines={1}>
            {formatEventDateLine(nextOccurrenceISO, event.repeat, prefs.calendar, i18n.language)}
          </Text>
          <HeroCountdown targetISO={nextOccurrenceISO} textColor={textColor} labelColor={secondaryColor} />
        </View>
      </>
    ) : (
      // No events yet — still show the "Today" banner (photo/caption/real
      // current date+weekday+time), just without a title/countdown since
      // there's no event to count down to.
      <>
        {caption}
        <View style={styles.bottom}>
          <Text style={[styles.title, { color: textColor }]} numberOfLines={1}>
            {t('events.todayTitle')}
          </Text>
          <Text style={[styles.dateLine, { color: secondaryColor }]} numberOfLines={1}>
            {formatTodayLine(prefs.calendar, i18n.language)}
          </Text>
        </View>
      </>
    );

  if (photoUri) {
    return (
      <ImageBackground
        source={{ uri: photoUri }}
        style={[styles.card, { borderRadius: radius.lg, minHeight: height }]}
        imageStyle={{ borderRadius: radius.lg }}
      >
        <View style={[styles.photoScrim, { borderRadius: radius.lg, padding: spacing.md }]}>{content}</View>
      </ImageBackground>
    );
  }

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: background,
          borderColor: preset.border,
          borderWidth: preset.border ? 1 : 0,
          borderRadius: radius.lg,
          minHeight: height,
          padding: spacing.md,
        },
      ]}
    >
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { justifyContent: 'space-between', overflow: 'hidden' },
  photoScrim: { flex: 1, justifyContent: 'space-between', backgroundColor: 'rgba(0,0,0,0.32)' },
  heroCaption: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
    color: 'rgba(255,255,255,0.85)',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  categoryText: { fontSize: 14, fontWeight: '600' },
  repeatText: { fontSize: 13, fontWeight: '500' },
  bottom: { gap: 8, marginTop: 12 },
  title: { fontSize: 27, fontWeight: '800' },
  dateLine: { fontSize: 16, fontWeight: '500', marginBottom: 2 },
});
