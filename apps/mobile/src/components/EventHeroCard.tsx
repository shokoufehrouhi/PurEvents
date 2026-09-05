import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme/PreferencesContext';
import { CARD_THEMES } from '../theme/cardThemes';
import { accents } from '../theme/tokens';
import type { PurEvent } from '../types/event';
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
export function EventHeroCard({ event, height = 180 }: Props) {
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
          height,
          padding: spacing.md,
        },
      ]}
    >
      <EventIcon category={event.category} size={40} variant={preset.iconVariant} />
      <View style={styles.bottom}>
        <Text style={[styles.title, { color: preset.text }]} numberOfLines={1}>
          {event.title}
        </Text>
        <HeroCountdown targetISO={event.dateTimeISO} textColor={preset.text} labelColor={preset.secondary} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { justifyContent: 'space-between', overflow: 'hidden' },
  bottom: { gap: 8 },
  title: { fontSize: 20, fontWeight: '700' },
});
