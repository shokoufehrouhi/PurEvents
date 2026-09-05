import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { getEventIcon } from '../theme/icons';

interface Props {
  iconKey: string;
  size?: number;
  /** 'pastel' = tinted badge with colored glyph (default/unselected).
   *  'solid' = fully saturated badge with a white glyph (selected, or
   *  standalone use over a colorful background like the hero card). */
  variant?: 'pastel' | 'solid';
  ringColor?: string;
}

// Squircle icon badge used for the event icon everywhere it appears (picker,
// list rows, hero cards, detail header) — see UI feedback that raw emoji
// looked unpolished. 52px target / ~30% corner radius matches the approved
// icon-system mockup.
export function EventIcon({ iconKey, size = 52, variant = 'pastel', ringColor }: Props) {
  const icon = getEventIcon(iconKey);
  const isSolid = variant === 'solid';
  const radius = Math.round(size * 0.3);

  return (
    <View
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: isSolid ? icon.color : `${icon.color}26`,
          borderWidth: ringColor ? 2 : 0,
          borderColor: ringColor,
        },
      ]}
    >
      <MaterialCommunityIcons name={icon.name} size={Math.round(size * 0.5)} color={isSolid ? '#fff' : icon.color} />
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
});
