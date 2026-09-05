import { Image, StyleSheet, View } from 'react-native';

import { getCategoryIcon } from '../theme/icons';
import type { EventCategory } from '../types/event';

interface Props {
  category: EventCategory;
  size?: number;
}

// Icon badge for an event: a white squircle (reads clearly on any surface —
// gradient hero cards, colored category chips, plain list rows) with the
// category's icon artwork (cropped from the approved mockup, see
// src/theme/icons.ts) centered on top. Category and icon are the same
// choice now — no separate icon picker (see UI feedback).
export function EventIcon({ category, size = 52 }: Props) {
  const { image } = getCategoryIcon(category);
  const radius = Math.round(size * 0.3);

  return (
    <View style={[styles.base, { width: size, height: size, borderRadius: radius }]}>
      <Image source={image} style={{ width: size * 0.6, height: size * 0.6 }} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.92)' },
});
