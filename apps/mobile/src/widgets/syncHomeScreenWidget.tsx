import { Platform } from 'react-native';
import { requestWidgetUpdate } from 'react-native-android-widget';

import { ANDROID_WIDGET_NAME, CountdownWidget } from './androidWidgetTask';
import { syncIOSWidget } from './iosWidgetSync';
import { getNextEventSummary } from './nextEventSummary';

// Called from storage/events.ts after every create/update/delete, and once
// at app launch (see app/_layout.tsx) — pushes the current "nearest
// upcoming event" out to whichever platform's home-screen widget actually
// exists. Safe to call on every platform/every save: @bacons/apple-targets'
// ExtensionStorage itself no-ops when its native module isn't present (see
// its own source), and the Android branch below is skipped outright on
// iOS, so there's no need to platform-guard the imports themselves.
export async function syncHomeScreenWidget(): Promise<void> {
  if (Platform.OS === 'ios') {
    await syncIOSWidget();
    return;
  }

  if (Platform.OS === 'android') {
    await requestWidgetUpdate({
      widgetName: ANDROID_WIDGET_NAME,
      renderWidget: async () => <CountdownWidget summary={await getNextEventSummary()} />,
      widgetNotFound: () => {},
    });
  }
}
