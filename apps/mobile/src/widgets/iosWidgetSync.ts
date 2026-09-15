import { ExtensionStorage } from '@bacons/apple-targets';

import { listUpcomingEventsForWidgets } from './widgetEventSummary';

// Must match app.json's ios.entitlements app-group *and* the same string
// inside targets/widget/expo-target.config.js — both sides of the App
// Group have to agree on this exact identifier or they end up reading/
// writing two different sandboxed containers with the same name.
export const WIDGET_APP_GROUP = 'group.com.anonymous.puraevents.widget';
const STORAGE_KEY = 'events';

// The iOS widget extension (targets/widget/widget.swift) is a completely
// separate process from this app — it has no access to AsyncStorage, so
// the only way to hand it fresh data is writing a plain value into the App
// Group's shared UserDefaults (see the ExtensionStorage README) and asking
// WidgetKit to reload. Call this whenever an event is created/updated/
// deleted (see storage/events.ts) and once at app launch.
//
// Writes the *whole* upcoming-events list, not just the nearest one — each
// widget instance can be configured (long-press → Edit Widget) to show any
// one of them, via SelectEventIntent/EventEntity in widget.swift, which
// resolves its own choice against this same list at render time.
export async function syncIOSWidget(): Promise<void> {
  const events = await listUpcomingEventsForWidgets();
  const storage = new ExtensionStorage(WIDGET_APP_GROUP);
  storage.set(STORAGE_KEY, events.length ? JSON.stringify(events) : undefined);
  ExtensionStorage.reloadWidget();
}
