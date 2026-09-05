import { Image, View } from 'react-native';

import { getCategoryIcon } from '../theme/icons';
import type { EventCategory } from '../types/event';

interface Props {
  category: EventCategory;
  size?: number;
  /** 'white' (default) reads on any colorful/dark surface. 'pastel' and
   *  'solid' tint the badge with the category's own color — used by the
   *  Clean/Dark hero card themes, see src/theme/cardThemes.ts. */
  variant?: 'white' | 'pastel' | 'solid';
}

// Icon badge for an event: a squircle (reads clearly on any surface —
// gradient hero cards, colored category chips, plain list rows) with the
// category's icon artwork (cropped from the approved mockup, see
// src/theme/icons.ts) centered on top. Category and icon are the same
// choice now — no separate icon picker (see UI feedback).
export function EventIcon({ category, size = 52, variant = 'white' }: Props) {
  const { image, color } = getCategoryIcon(category);
  const radius = Math.round(size * 0.3);
  const background =
    variant === 'solid' ? color : variant === 'pastel' ? `${color}26` : 'rgba(255,255,255,0.92)';

  return (
    <View
      style={{ width: size, height: size, borderRadius: radius, backgroundColor: background, alignItems: 'center', justifyContent: 'center' }}
    >
      <Image source={image} style={{ width: size * 0.82, height: size * 0.82 }} resizeMode="contain" />
    </View>
  );
}
