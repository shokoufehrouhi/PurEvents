import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme/PreferencesContext';
import { CARD_THEMES } from '../theme/cardThemes';
import { accents } from '../theme/tokens';
import type { PurEvent } from '../types/event';
import { formatEventDateLine } from '../utils/eventDate';
import { EventIcon } from './EventIcon';
import { HeroCountdown } from './HeroCountdown';

interface Props {
  event: PurEvent;
  height?: number;
}

// Hero card for an event — one of three flat presets (Clean/Color/Dark, see
// src/theme/cardThemes.ts and the Appearance step of the wizard). 'color'
// fills with the event's own accentColor; the other two are fixed colors
// independent of accent/category. MVP has no cover-photo picker yet — see
// docs/PROJECT.md follow-ups.
export function EventHeroCard({ event, height = 170 }: Props) {
  const { t } = useTranslation();
  const { radius, spacing } = useTheme();
  const preset = CARD_THEMES[event.cardTheme] ?? CARD_THEMES.color;
  const background = preset.background ?? accents[event.accentColor] ?? accents.violet;

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
      <View style={styles.metaRow}>
        <View style={styles.categoryRow}>
          <EventIcon category={event.category} size={22} variant={preset.iconVariant} />
          <Text style={[styles.categoryText, { color: preset.text }]} numberOfLines={1}>
            {t(`events.category.${event.category}`)}
          </Text>
        </View>
        <Text style={[styles.repeatText, { color: preset.secondary }]} numberOfLines={1}>
          {t(`events.repeat.${event.repeat}`)}
        </Text>
      </View>

      <View style={styles.bottom}>
        <Text style={[styles.title, { color: preset.text }]} numberOfLines={1}>
          {event.title}
        </Text>
        <Text style={[styles.dateLine, { color: preset.secondary }]} numberOfLines={1}>
          {formatEventDateLine(event.dateTimeISO, event.repeat)}
        </Text>
        <HeroCountdown targetISO={event.dateTimeISO} textColor={preset.text} labelColor={preset.secondary} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { justifyContent: 'space-between', overflow: 'hidden' },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  categoryText: { fontSize: 13, fontWeight: '600' },
  repeatText: { fontSize: 12, fontWeight: '500' },
  bottom: { gap: 6, marginTop: 12 },
  title: { fontSize: 20, fontWeight: '700' },
  dateLine: { fontSize: 13, fontWeight: '500', marginBottom: 2 },
});
