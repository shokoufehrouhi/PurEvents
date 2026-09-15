import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import {
  FlexWidget,
  registerWidgetConfigurationScreen,
  registerWidgetTaskHandler,
  requestPinWidget,
  TextWidget,
  type WidgetConfigurationScreen,
  type WidgetTaskHandler,
} from 'react-native-android-widget';

import {
  clearConfiguredEventId,
  getConfiguredEventId,
  setConfiguredEventId,
  setPendingConfigureEventId,
  takePendingConfigureEventId,
} from './androidWidgetConfig';
import { listUpcomingEventsForWidgets, type WidgetEventSummary } from './widgetEventSummary';

export const ANDROID_WIDGET_NAME = 'CountdownWidget';

// Plain accent-colored card — title, big day count, "DAYS LEFT" caption.
// Deliberately not trying to match every MiniWidget theme/photo option;
// AppWidget RemoteViews (what this library compiles JSX down to) can't
// render an arbitrary photo background as cheaply/reliably as the in-app
// mockup can, and a flat color reads fine at this size. Tapping anywhere
// opens the app (clickAction="OPEN_APP").
export function CountdownWidget({ summary }: { summary: WidgetEventSummary | null }) {
  if (!summary) {
    return (
      <FlexWidget
        clickAction="OPEN_APP"
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundColor: '#2B2640',
          borderRadius: 20,
          padding: 12,
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <TextWidget text="No upcoming events" style={{ color: '#FFFFFF', fontSize: 13, textAlign: 'center' }} />
      </FlexWidget>
    );
  }

  const daysLeft = Math.max(0, dayjs(summary.nextOccurrenceISO).diff(dayjs(), 'day'));

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: summary.accentHex,
        borderRadius: 20,
        padding: 14,
        justifyContent: 'space-between',
      }}
    >
      <TextWidget
        text={summary.title}
        maxLines={1}
        truncate="END"
        style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '700' }}
      />
      <FlexWidget style={{ width: 'wrap_content', height: 'wrap_content' }}>
        <TextWidget text={String(daysLeft)} style={{ color: '#FFFFFF', fontSize: 32, fontWeight: '800' }} />
        <TextWidget text="DAYS LEFT" style={{ color: 'rgba(255, 255, 255, 0.85)', fontSize: 10, fontWeight: '700' }} />
      </FlexWidget>
    </FlexWidget>
  );
}

// Which event a *specific* widget instance (identified by its own
// widgetId — Android natively supports multiple independent instances of
// one provider) is configured to show, falling back to the soonest
// upcoming event if nothing's been picked yet (shouldn't normally happen,
// since app.json's widgetFeatures: 'reconfigurable' forces the
// ConfigurationScreen below before a new instance is ever added).
async function resolveSummaryForWidget(widgetId: number): Promise<WidgetEventSummary | null> {
  const events = await listUpcomingEventsForWidgets();
  const configuredId = await getConfiguredEventId(widgetId);
  return events.find((e) => e.id === configuredId) ?? events[0] ?? null;
}

const widgetTaskHandler: WidgetTaskHandler = async ({ widgetAction, widgetInfo, renderWidget }) => {
  if (widgetAction === 'WIDGET_DELETED') {
    await clearConfiguredEventId(widgetInfo.widgetId);
    return;
  }
  const summary = await resolveSummaryForWidget(widgetInfo.widgetId);
  renderWidget(<CountdownWidget summary={summary} />);
};

// Called once, early (see app/_layout.tsx) — registers the headless JS task
// Android calls into whenever a CountdownWidget instance is added, resized,
// clicked, or hits its own updatePeriodMillis (app.json). Runs inside this
// app's own JS/AsyncStorage, unlike iOS's widget extension (a separate
// process — see iosWidgetSync.ts for why that side needs an explicit data
// hand-off instead).
export function initAndroidWidgetTaskHandler(): void {
  registerWidgetTaskHandler(widgetTaskHandler);
}

// Entry point for "add this event to my Home Screen" from the event detail
// screen (app/event/[id]/index.tsx), as opposed to the generic, no-event
// "Add to Home Screen" button on the Widgets tab (add-widget-to-home.tsx),
// which leaves the ConfigurationScreen below to show its normal picker.
// Stashing the eventId is the only option — requestPinWidget() only tells
// us whether the user accepted the OS's own "Add to Home screen?" prompt,
// never the widgetId of the instance it goes on to create (the OS decides
// that itself, afterward), so there's no id yet to call
// setConfiguredEventId with directly.
export async function requestPinWidgetForEvent(eventId: string): Promise<boolean> {
  await setPendingConfigureEventId(eventId);
  return requestPinWidget({ widgetName: ANDROID_WIDGET_NAME });
}

// Shown once, automatically, the moment a new CountdownWidget instance is
// dropped on the home screen (app.json's widgetFeatures: 'reconfigurable'
// forces this rather than making it optional) — a plain event list, tap to
// pick. Deliberately not using the app's own useTheme()/PreferencesProvider
// styling: this runs as its own React root (registered separately from
// app/_layout.tsx's tree, see AppRegistry.registerComponent in
// register-widget-configuration-screen's own source), so that context
// isn't available here — hardcoded colors instead.
const ConfigurationScreen: WidgetConfigurationScreen = ({ widgetInfo, renderWidget, setResult }) => {
  const [events, setEvents] = useState<WidgetEventSummary[] | null>(null);

  async function pick(event: WidgetEventSummary) {
    await setConfiguredEventId(widgetInfo.widgetId, event.id);
    renderWidget(<CountdownWidget summary={event} />);
    setResult('ok');
  }

  useEffect(() => {
    // Both reads happen before any setState, so a pending-event match never
    // gets a chance to render the list first — pick() runs and setResult()
    // closes this screen before the user sees anything but the blank
    // loading view below. A leftover pending id from some earlier,
    // interrupted pin (e.g. the user backed out of the OS prompt) that no
    // longer matches any *upcoming* event just falls through to the normal
    // picker instead of silently doing nothing.
    Promise.all([listUpcomingEventsForWidgets(), takePendingConfigureEventId()]).then(([loaded, pendingEventId]) => {
      const pendingMatch = pendingEventId ? loaded.find((e) => e.id === pendingEventId) : undefined;
      if (pendingMatch) {
        pick(pendingMatch);
        return;
      }
      setEvents(loaded);
    });
  }, []);

  if (!events) return <View style={{ flex: 1, backgroundColor: '#151221' }} />;

  if (events.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: '#151221', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ color: '#FFFFFF', fontSize: 15, textAlign: 'center' }}>
          No upcoming events yet — create one in PuraEvents first, then add this widget again.
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: '#151221' }}
      data={events}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <Pressable
          onPress={() => pick(item)}
          style={({ pressed }) => ({
            padding: 16,
            borderBottomWidth: 1,
            borderBottomColor: '#2B2640',
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={{ color: '#9992B8', fontSize: 13, marginTop: 2 }}>{dayjs(item.nextOccurrenceISO).format('MMM D, YYYY')}</Text>
        </Pressable>
      )}
    />
  );
};

export function initAndroidWidgetConfigurationScreen(): void {
  registerWidgetConfigurationScreen(ConfigurationScreen);
}
