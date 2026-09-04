import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, type TextStyle } from 'react-native';

interface Props {
  targetISO: string;
  style?: TextStyle;
}

// Simple ticking countdown for in-app display. The equivalent live text on
// the home-screen widget must use the native platform primitive instead
// (Text(timerInterval:) on iOS, periodic WorkManager updates on Android) —
// see docs/PROJECT.md §5.1. This component is for the React Native UI only.
export function CountdownText({ targetISO, style }: Props) {
  const { t } = useTranslation();
  const [now, setNow] = useState(() => dayjs());

  useEffect(() => {
    const interval = setInterval(() => setNow(dayjs()), 1000);
    return () => clearInterval(interval);
  }, []);

  const target = dayjs(targetISO);
  const diffSeconds = target.diff(now, 'second');

  if (diffSeconds <= 0) {
    return <Text style={style}>{t('countdown.past')}</Text>;
  }

  const days = Math.floor(diffSeconds / 86400);
  const hours = Math.floor((diffSeconds % 86400) / 3600);
  const minutes = Math.floor((diffSeconds % 3600) / 60);
  const seconds = diffSeconds % 60;

  const parts = [
    days > 0 && t('countdown.days', { count: days }),
    (days > 0 || hours > 0) && t('countdown.hours', { count: hours }),
    t('countdown.minutes', { count: minutes }),
    t('countdown.seconds', { count: seconds }),
  ].filter(Boolean);

  return <Text style={style}>{parts.join(' ')}</Text>;
}
