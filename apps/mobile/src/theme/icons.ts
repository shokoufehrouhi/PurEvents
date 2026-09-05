import type { MaterialCommunityIcons } from '@expo/vector-icons';

import { accents } from './tokens';

type MCIName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

// Curated icon identity per event type: a fixed vector glyph + brand color,
// replacing raw emoji (inconsistent rendering across OS/fonts, and flat —
// see UI feedback that led to this file). Each entry's `color` is used for
// both the pastel default badge and the saturated selected badge.
export const EVENT_ICONS: { key: string; name: MCIName; color: string }[] = [
  { key: 'celebration', name: 'party-popper', color: accents.violet },
  { key: 'birthday', name: 'cake-variant', color: '#FF6B9D' },
  { key: 'travel', name: 'airplane', color: '#2F9BFF' },
  { key: 'work', name: 'briefcase', color: '#7C6EF6' },
  { key: 'finance', name: 'cash-multiple', color: accents.mint },
  { key: 'love', name: 'heart', color: accents.coral },
  { key: 'graduation', name: 'school', color: accents.amber },
  { key: 'wedding', name: 'ring', color: '#EC7FA9' },
  { key: 'launch', name: 'rocket-launch', color: '#A855F7' },
  { key: 'other', name: 'map-marker', color: '#94A3B8' },
];

export const DEFAULT_EVENT_ICON = EVENT_ICONS[0].key;

export function getEventIcon(key: string) {
  return EVENT_ICONS.find((i) => i.key === key) ?? EVENT_ICONS[0];
}
