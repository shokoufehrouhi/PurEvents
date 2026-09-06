import AsyncStorage from '@react-native-async-storage/async-storage';

// Random photo of the user's current city/country for the top hero card's
// background (Events tab, "next event" card only — see EventHeroCard's
// photoUri prop). Location comes from the device's timezone, not GPS, so no
// location permission is ever requested. Photos come from the Pexels API
// (free, no billing account needed — see .env.example for the API key).

const CACHE_KEY = 'locationPhotoCache';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h — new random photo once a day

interface PhotoCache {
  place: string;
  url: string;
  fetchedAt: number;
}

// "Asia/Tehran" -> "Tehran", "America/New_York" -> "New York".
export function getLocalPlaceName(): string {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const parts = tz.split('/');
  const city = parts[parts.length - 1] ?? tz;
  return city.replace(/_/g, ' ');
}

// Returns a photo URL for the device's current place, caching the pick for
// 24h so the card doesn't change photo on every app open. Returns null on
// any failure (missing API key, offline, no results) so callers can just
// fall back to the flat CARD_THEMES background.
export async function fetchLocationPhotoUrl(): Promise<string | null> {
  const apiKey = process.env.EXPO_PUBLIC_PEXELS_API_KEY;
  if (!apiKey) return null;
  const place = getLocalPlaceName();

  try {
    const cachedRaw = await AsyncStorage.getItem(CACHE_KEY);
    if (cachedRaw) {
      const cached: PhotoCache = JSON.parse(cachedRaw);
      if (cached.place === place && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
        return cached.url;
      }
    }
  } catch {
    // ignore cache read errors — just refetch
  }

  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(place)}&per_page=15&orientation=landscape`,
      { headers: { Authorization: apiKey } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    const photos: { src?: { large2x?: string; large?: string; original?: string } }[] = data.photos ?? [];
    if (photos.length === 0) return null;
    const pick = photos[Math.floor(Math.random() * photos.length)];
    const url = pick.src?.large2x ?? pick.src?.large ?? pick.src?.original;
    if (!url) return null;

    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ place, url, fetchedAt: Date.now() } satisfies PhotoCache));
    return url;
  } catch {
    return null;
  }
}
