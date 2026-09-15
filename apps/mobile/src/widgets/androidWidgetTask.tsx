import dayjs from 'dayjs';
import { FlexWidget, registerWidgetTaskHandler, TextWidget, type WidgetTaskHandler } from 'react-native-android-widget';

import { getNextEventSummary, type NextEventSummary } from './nextEventSummary';

export const ANDROID_WIDGET_NAME = 'CountdownWidget';

// Plain accent-colored card — title, big day count, "DAYS LEFT" caption.
// Deliberately not trying to match every MiniWidget theme/photo option;
// AppWidget RemoteViews (what this library compiles JSX down to) can't
// render an arbitrary photo background as cheaply/reliably as the in-app
// mockup can, and a flat color reads fine at this size. Tapping anywhere
// opens the app (clickAction="OPEN_APP").
// Exported so syncHomeScreenWidget.tsx's own explicit requestWidgetUpdate
// call (fired right after a save, for an immediate refresh) can render the
// exact same look instead of keeping a second copy of this JSX in sync.
export function CountdownWidget({ summary }: { summary: NextEventSummary | null }) {
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

const widgetTaskHandler: WidgetTaskHandler = async ({ widgetAction, renderWidget }) => {
  if (widgetAction === 'WIDGET_DELETED') return;
  const summary = await getNextEventSummary();
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
