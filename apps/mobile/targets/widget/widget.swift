import AppIntents
import SwiftUI
import WidgetKit

// Namespaced as static members of an enum (never instantiated) rather than
// top-level `let`/`func` declarations — a file with @main can't coexist
// with genuine top-level *executable* code in the same module, and
// isoFormatter's immediately-invoked closure below counts as exactly that
// at file scope. Wrapping everything in a type sidesteps the question
// entirely.
private enum Shared {
    // Must match app.json's ios.entitlements app-group *and*
    // src/widgets/iosWidgetSync.ts's WIDGET_APP_GROUP exactly — this is the
    // only channel data crosses between the main app (a separate process)
    // and this extension.
    static let appGroup = "group.com.anonymous.puraevents.widget"
    static let eventsKey = "events"

    static let isoFormatter: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()

    // Mirrors src/widgets/widgetEventSummary.ts's WidgetEventSummary shape
    // exactly — the JSON array the main app writes via ExtensionStorage,
    // one entry per still-upcoming event (soonest first).
    struct EventSummary: Decodable {
        let id: String
        let title: String
        let nextOccurrenceISO: String
        let accentHex: String
    }

    static func loadEvents() -> [EventSummary] {
        guard
            let defaults = UserDefaults(suiteName: appGroup),
            let json = defaults.string(forKey: eventsKey),
            let data = json.data(using: .utf8),
            let events = try? JSONDecoder().decode([EventSummary].self, from: data)
        else { return [] }
        return events
    }

    static func parseISODate(_ iso: String) -> Date? {
        isoFormatter.date(from: iso) ?? ISO8601DateFormatter().date(from: iso)
    }

    static func hexColor(_ hex: String) -> Color {
        var sanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        sanitized.removeAll { $0 == "#" }
        var rgb: UInt64 = 0
        Scanner(string: sanitized).scanHexInt64(&rgb)
        return Color(
            red: Double((rgb & 0xFF0000) >> 16) / 255,
            green: Double((rgb & 0x00FF00) >> 8) / 255,
            blue: Double(rgb & 0x0000FF) / 255
        )
    }
}

// The widget-configuration picker's entry type — one per event in
// Shared.loadEvents(). Only `id`/`title` actually drive the system picker
// UI (via displayRepresentation); the rest gets re-resolved fresh from
// Shared.loadEvents() in the timeline provider below rather than trusted
// from whatever was cached when the user originally picked it, so a
// widget already on the Home Screen still reflects a since-edited title/
// date/color without the user having to reconfigure it.
struct EventEntity: AppEntity {
    let id: String
    let title: String

    static var typeDisplayRepresentation: TypeDisplayRepresentation = "Event"
    static var defaultQuery = EventEntityQuery()

    var displayRepresentation: DisplayRepresentation {
        DisplayRepresentation(title: LocalizedStringResource(stringLiteral: title))
    }
}

struct EventEntityQuery: EntityQuery {
    func entities(for identifiers: [String]) async throws -> [EventEntity] {
        Shared.loadEvents()
            .filter { identifiers.contains($0.id) }
            .map { EventEntity(id: $0.id, title: $0.title) }
    }

    // Populates the picker's own list when the user taps this widget's
    // "Event" parameter in Edit Widget — every still-upcoming event,
    // soonest first (see listUpcomingEventsForWidgets.ts's own ordering).
    func suggestedEntities() async throws -> [EventEntity] {
        Shared.loadEvents().map { EventEntity(id: $0.id, title: $0.title) }
    }
}

// iOS 17+'s AppIntents-based widget configuration — what actually puts an
// "Event" picker in the Home Screen's Edit Widget sheet. No perform() to
// implement: WidgetConfigurationIntent supplies a no-op default, this
// exists purely to describe the one parameter.
struct SelectEventIntent: WidgetConfigurationIntent {
    static var title: LocalizedStringResource = "Select Event"
    static var description = IntentDescription("Choose which event this widget shows.")

    @Parameter(title: "Event")
    var event: EventEntity?
}

struct NextEventEntry: TimelineEntry {
    let date: Date
    let title: String?
    let accentHex: String
    let targetDate: Date?
}

struct Provider: AppIntentTimelineProvider {
    // Shown in the widget gallery/preview before the extension has ever
    // actually run once with real data.
    func placeholder(in context: Context) -> NextEventEntry {
        NextEventEntry(date: Date(), title: "New York Trip", accentHex: "#A39BE8", targetDate: Date().addingTimeInterval(60 * 60 * 24 * 5))
    }

    func snapshot(for configuration: SelectEventIntent, in context: Context) async -> NextEventEntry {
        resolveCurrentEntry(for: configuration)
    }

    // One entry per day from now through the event's own date (capped at
    // 35 days out — the countdown display never needs finer granularity
    // than a whole day, and there's no reason to generate more entries
    // than a user could plausibly scroll back to see), each carrying the
    // same fixed targetDate — the view itself computes "days left" from
    // entry.date vs targetDate at render time, matching how
    // Text(timerInterval:) style countdowns are meant to stay accurate
    // without the extension needing to wake up again in between.
    func timeline(for configuration: SelectEventIntent, in context: Context) async -> Timeline<NextEventEntry> {
        let calendar = Calendar.current
        let now = Date()
        let resolved = resolveSelectedEvent(for: configuration)

        guard let resolved, let targetDate = Shared.parseISODate(resolved.nextOccurrenceISO) else {
            return Timeline(entries: [NextEventEntry(date: now, title: nil, accentHex: "#6558D9", targetDate: nil)], policy: .after(calendar.date(byAdding: .hour, value: 1, to: now) ?? now))
        }

        let daysUntilTarget = calendar.dateComponents([.day], from: now, to: targetDate).day ?? 0
        let entryCount = max(1, min(daysUntilTarget + 1, 35))

        var entries: [NextEventEntry] = []
        for dayOffset in 0..<entryCount {
            guard let entryDate = calendar.date(byAdding: .day, value: dayOffset, to: calendar.startOfDay(for: now)) else { continue }
            entries.append(NextEventEntry(date: entryDate, title: resolved.title, accentHex: resolved.accentHex, targetDate: targetDate))
        }

        // Re-derive from the shared data again once these entries run out —
        // either the event happened (needs a fresh "next" one) or the app
        // already asked for an earlier reload via
        // ExtensionStorage.reloadWidget(), whichever comes first.
        let nextReload = entries.last?.date ?? now
        return Timeline(entries: entries, policy: .after(calendar.date(byAdding: .day, value: 1, to: nextReload) ?? nextReload))
    }

    // configuration.event only carries id/title (see EventEntity) — always
    // re-fetched against the *current* shared events list by id here,
    // falling back to the soonest-upcoming event when nothing's been
    // configured yet (a freshly-added widget, before its first Edit
    // Widget) or the previously-picked event no longer exists (deleted).
    private func resolveSelectedEvent(for configuration: SelectEventIntent) -> Shared.EventSummary? {
        let events = Shared.loadEvents()
        if let selectedId = configuration.event?.id, let match = events.first(where: { $0.id == selectedId }) {
            return match
        }
        return events.first
    }

    private func resolveCurrentEntry(for configuration: SelectEventIntent) -> NextEventEntry {
        guard let resolved = resolveSelectedEvent(for: configuration), let targetDate = Shared.parseISODate(resolved.nextOccurrenceISO) else {
            return NextEventEntry(date: Date(), title: nil, accentHex: "#6558D9", targetDate: nil)
        }
        return NextEventEntry(date: Date(), title: resolved.title, accentHex: resolved.accentHex, targetDate: targetDate)
    }
}

struct PuraEventsWidgetEntryView: View {
    var entry: Provider.Entry

    var body: some View {
        ZStack {
            Shared.hexColor(entry.accentHex)
            if let title = entry.title, let targetDate = entry.targetDate {
                let daysLeft = max(0, Calendar.current.dateComponents([.day], from: Calendar.current.startOfDay(for: Date()), to: Calendar.current.startOfDay(for: targetDate)).day ?? 0)
                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.white)
                        .lineLimit(1)
                    Spacer()
                    Text("\(daysLeft)")
                        .font(.system(size: 32, weight: .heavy))
                        .foregroundColor(.white)
                    Text("DAYS LEFT")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(.white.opacity(0.85))
                }
                .padding()
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
            } else {
                Text("No upcoming events")
                    .font(.system(size: 13))
                    .foregroundColor(.white)
                    .multilineTextAlignment(.center)
                    .padding()
            }
        }
    }
}

struct PuraEventsWidget: Widget {
    let kind: String = "PuraEventsWidget"

    var body: some WidgetConfiguration {
        AppIntentConfiguration(kind: kind, intent: SelectEventIntent.self, provider: Provider()) { entry in
            PuraEventsWidgetEntryView(entry: entry)
                .containerBackground(.clear, for: .widget)
        }
        .configurationDisplayName("PuraEvents Countdown")
        .description("Pick an event and see how many days are left.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

@main
struct PuraEventsWidgetBundle: WidgetBundle {
    var body: some Widget {
        PuraEventsWidget()
    }
}
