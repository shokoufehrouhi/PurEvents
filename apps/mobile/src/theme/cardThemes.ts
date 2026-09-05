import type { CardTheme } from '../types/event';

// Hero card presets — deliberately independent of the app's own light/dark
// scheme (PreferencesContext) and of the event's category color: these are
// a *card* skin the user picks in Appearance. `background` is omitted for
// 'color' since that preset fills with the event's own accentColor instead
// of a fixed color (see EventHeroCard).
export const CARD_THEMES: Record<
  CardTheme,
  {
    background?: string;
    border?: string;
    text: string;
    secondary: string;
    /** How the EventIcon badge should render on this background. */
    iconVariant: 'white' | 'pastel' | 'solid';
  }
> = {
  clean: {
    background: '#FFFFFF',
    border: '#DDDEE6',
    text: '#171821',
    secondary: '#646672',
    iconVariant: 'pastel',
  },
  color: {
    text: '#FFFFFF',
    secondary: 'rgba(255,255,255,0.78)',
    iconVariant: 'white',
  },
  dark: {
    background: '#12121A',
    text: '#FFFFFF',
    secondary: 'rgba(255,255,255,0.7)',
    iconVariant: 'solid',
  },
};

export const CARD_THEME_KEYS: CardTheme[] = ['clean', 'color', 'dark'];
