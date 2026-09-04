import type { TFunction } from 'i18next';

/** Preset reminder offsets (minutes-before-event) offered in the wizard. */
export const PRESET_REMINDER_OFFSETS = [0, 60, 1440, 10080];

export function reminderLabel(minutes: number, t: TFunction): string {
  switch (minutes) {
    case 0:
      return t('events.reminderAtTime');
    case 60:
      return t('events.reminder1Hour');
    case 1440:
      return t('events.reminder1Day');
    case 10080:
      return t('events.reminder1Week');
    default:
      return minutes < 60
        ? t('countdown.minutes', { count: minutes })
        : minutes < 1440
          ? t('countdown.hours', { count: Math.round(minutes / 60) })
          : t('countdown.days', { count: Math.round(minutes / 1440) });
  }
}
