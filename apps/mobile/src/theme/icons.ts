import type { EventCategory } from '../types/event';

// Icon identity is tied 1:1 to category (no separate icon picker — see UI
// feedback that having them as independent choices was confusing). Artwork
// cropped directly from the approved category-chip mockup, background
// chroma-keyed to transparent so it can sit on our own tinted/solid badge.
export const CATEGORY_ICONS: Record<EventCategory, { color: string; image: number }> = {
  personal: { color: '#FF6B6B', image: require('../../assets/icons/categories/personal.png') },
  work: { color: '#7C6EF6', image: require('../../assets/icons/categories/work.png') },
  travel: { color: '#2F9BFF', image: require('../../assets/icons/categories/travel.png') },
  finance: { color: '#22C58E', image: require('../../assets/icons/categories/finance.png') },
  health: { color: '#FF6B9D', image: require('../../assets/icons/categories/health.png') },
  other: { color: '#8B5CF6', image: require('../../assets/icons/categories/other.png') },
};

export function getCategoryIcon(category: EventCategory) {
  return CATEGORY_ICONS[category] ?? CATEGORY_ICONS.other;
}
