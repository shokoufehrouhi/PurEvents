import { Image, StyleSheet } from 'react-native';

import { getEventIcon } from '../theme/icons';

interface Props {
  iconKey: string;
  size?: number;
  /** 'pastel' = default badge (own tinted background, baked into the asset).
   *  'solid' = saturated badge with the checkmark baked in — used for the
   *  selected state in the picker, or standalone elsewhere. */
  variant?: 'pastel' | 'solid';
}

// Icon badge sourced directly from the approved icon-system mockup (cropped
// illustrated artwork, not a vector-font substitute) — see src/theme/icons.ts
// and assets/icons/. Used everywhere an event's icon appears: the picker,
// list rows, hero cards, detail header.
export function EventIcon({ iconKey, size = 52, variant = 'pastel' }: Props) {
  const icon = getEventIcon(iconKey);
  const source = variant === 'solid' ? icon.selected : icon.default;

  return (
    <Image
      source={source}
      style={[styles.image, { width: size, height: size, borderRadius: Math.round(size * 0.3) }]}
      resizeMode="cover"
    />
  );
}

const styles = StyleSheet.create({
  image: { overflow: 'hidden' },
});
