// Curated icon identity per event type — cropped directly from the approved
// icon-system mockup (illustrated duotone artwork), not a vector-font
// substitute. Each icon ships two source images: the pastel "default" badge
// and the saturated "selected" badge (checkmark baked in, matching the
// mockup's own Selected state) — see assets/icons/.
export const EVENT_ICONS = [
  {
    key: 'celebration',
    color: '#6558D9',
    default: require('../../assets/icons/celebration.png'),
    selected: require('../../assets/icons/celebration-selected.png'),
  },
  {
    key: 'birthday',
    color: '#FF6B9D',
    default: require('../../assets/icons/birthday.png'),
    selected: require('../../assets/icons/birthday-selected.png'),
  },
  {
    key: 'travel',
    color: '#2F9BFF',
    default: require('../../assets/icons/travel.png'),
    selected: require('../../assets/icons/travel-selected.png'),
  },
  {
    key: 'work',
    color: '#7C6EF6',
    default: require('../../assets/icons/work.png'),
    selected: require('../../assets/icons/work-selected.png'),
  },
  {
    key: 'finance',
    color: '#22C58E',
    default: require('../../assets/icons/finance.png'),
    selected: require('../../assets/icons/finance-selected.png'),
  },
  {
    key: 'love',
    color: '#FF6B6B',
    default: require('../../assets/icons/love.png'),
    selected: require('../../assets/icons/love-selected.png'),
  },
  {
    key: 'graduation',
    color: '#FFB020',
    default: require('../../assets/icons/graduation.png'),
    selected: require('../../assets/icons/graduation-selected.png'),
  },
  {
    key: 'wedding',
    color: '#EC7FA9',
    default: require('../../assets/icons/wedding.png'),
    selected: require('../../assets/icons/wedding-selected.png'),
  },
  {
    key: 'launch',
    color: '#A855F7',
    default: require('../../assets/icons/launch.png'),
    selected: require('../../assets/icons/launch-selected.png'),
  },
] as const;

export type EventIconKey = (typeof EVENT_ICONS)[number]['key'];
export const DEFAULT_EVENT_ICON: EventIconKey = 'celebration';

export function getEventIcon(key: string) {
  return EVENT_ICONS.find((i) => i.key === key) ?? EVENT_ICONS[0];
}
