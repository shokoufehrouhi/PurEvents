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
    static let storageKey = "nextEvent"

    static let isoFormatter: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()

    // Mirrors src/widgets/nextEventSummary.ts's NextEventSummary shape
    // exactly — the JSON the main app writes via ExtensionStorage.
    struct NextEventSummary: Decodable {
        let title: String
        let nextOccurrenceISO: String
        let accentHex: String
    }

    static func loadNextEvent() -> NextEventSummary? {
        guard
            let defaults = UserDefaults(suiteName: appGroup),
            let json = defaults.string(forKey: storageKey),
            let data = json.data(using: .utf8)
        else { return nil }
        return try? JSONDecoder().decode(NextEventSummary.self, from: data)
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

struct NextEventEntry: TimelineEntry {
    let date: Date
    let title: String?
    let accentHex: String
    let targetDate: Date?
}

struct Provider: TimelineProvider {
    // Shown in the widget gallery/preview before the extension has ever
    // actually run once with real data.
    func placeholder(in context: Context) -> NextEventEntry {
        NextEventEntry(date: Date(), title: "New York Trip", accentHex: "#A39BE8", targetDate: Date().addingTimeInterval(60 * 60 * 24 * 5))
    }

    func getSnapshot(in context: Context, completion: @escaping (NextEventEntry) -> Void) {
        completion(currentEntry())
    }

    // One entry per day from now through the event's own date (capped at
    // 35 days out — the countdown display never needs finer granularity
    // than a whole day, and there's no reason to generate more entries
    // than a user could plausibly scroll back to see), each carrying the
    // same fixed targetDate — the view itself computes "days left" from
    // entry.date vs targetDate at render time, matching how
    // Text(timerInterval:) style countdowns are meant to stay accurate
    // without the extension needing to wake up again in between.
    func getTimeline(in context: Context, completion: @escaping (Timeline<NextEventEntry>) -> Void) {
        let summary = Shared.loadNextEvent()
        let calendar = Calendar.current
        let now = Date()

        guard let summary, let targetDate = Shared.parseISODate(summary.nextOccurrenceISO) else {
            completion(Timeline(entries: [NextEventEntry(date: now, title: nil, accentHex: "#6558D9", targetDate: nil)], policy: .after(calendar.date(byAdding: .hour, value: 1, to: now) ?? now)))
            return
        }

        let daysUntilTarget = calendar.dateComponents([.day], from: now, to: targetDate).day ?? 0
        let entryCount = max(1, min(daysUntilTarget + 1, 35))

        var entries: [NextEventEntry] = []
        for dayOffset in 0..<entryCount {
            guard let entryDate = calendar.date(byAdding: .day, value: dayOffset, to: calendar.startOfDay(for: now)) else { continue }
            entries.append(NextEventEntry(date: entryDate, title: summary.title, accentHex: summary.accentHex, targetDate: targetDate))
        }

        // Re-derive from the shared data again once these entries run out —
        // either the event happened (needs a fresh "next" one) or the app
        // already asked for an earlier reload via
        // ExtensionStorage.reloadWidget(), whichever comes first.
        let nextReload = entries.last?.date ?? now
        completion(Timeline(entries: entries, policy: .after(calendar.date(byAdding: .day, value: 1, to: nextReload) ?? nextReload)))
    }

    private func currentEntry() -> NextEventEntry {
        guard let summary = Shared.loadNextEvent(), let targetDate = Shared.parseISODate(summary.nextOccurrenceISO) else {
            return NextEventEntry(date: Date(), title: nil, accentHex: "#6558D9", targetDate: nil)
        }
        return NextEventEntry(date: Date(), title: summary.title, accentHex: summary.accentHex, targetDate: targetDate)
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
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            if #available(iOS 17.0, *) {
                PuraEventsWidgetEntryView(entry: entry)
                    .containerBackground(.clear, for: .widget)
            } else {
                PuraEventsWidgetEntryView(entry: entry)
            }
        }
        .configurationDisplayName("PuraEvents Countdown")
        .description("Shows your nearest upcoming event and how many days are left.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}

@main
struct PuraEventsWidgetBundle: WidgetBundle {
    var body: some Widget {
        PuraEventsWidget()
    }
}
