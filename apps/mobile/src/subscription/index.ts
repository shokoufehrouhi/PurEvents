// Placeholder subscription state until RevenueCat is wired up (Phase 3 —
// see docs/PROJECT.md §5/§6). Hardcoding `false` keeps every Pro gate in the
// UI real and reachable during development instead of silently vanishing.
export function usePro(): { isPro: boolean } {
  return { isPro: false };
}

// Free-tier limits, mirrored from docs/PROJECT.md §6.1.
export const FREE_LIMITS = {
  maxActiveEvents: 3,
  maxWidgets: 1,
  maxRemindersPerEvent: 1,
};
