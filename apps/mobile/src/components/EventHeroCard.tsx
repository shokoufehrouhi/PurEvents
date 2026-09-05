import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../theme/PreferencesContext';
import { accents } from '../theme/tokens';
import { getEventIcon } from '../theme/icons';
import { darken } from '../utils/color';
import type { PurEvent } from '../types/event';
import { HeroCountdown } from './HeroCountdown';

interface Props {
  event: PurEvent;
  height?: number;
}

// Gradient hero card standing in for a real cover photo (MVP has no image
// picker yet — see docs/PROJECT.md follow-ups). Uses the event's accent
// color for both the list card and the detail screen header.
export function EventHeroCard({ event, height = 180 }: Props) {
  const { radius, spacing } = useTheme();
  const base = accents[event.accentColor] ?? accents.violet;
  const icon = getEventIcon(event.icon);

  return (
    <LinearGradient
      colors={[base, darken(base, 0.35)]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, { borderRadius: radius.lg, height, padding: spacing.md }]}
    >
      <MaterialCommunityIcons name={icon.name} size={28} color="#fff" />
      <View style={styles.bottom}>
        <Text style={styles.title} numberOfLines={1}>
          {event.title}
        </Text>
        <HeroCountdown targetISO={event.dateTimeISO} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: { justifyContent: 'space-between', overflow: 'hidden' },
  bottom: { gap: 8 },
  title: { color: '#fff', fontSize: 20, fontWeight: '700' },
});
