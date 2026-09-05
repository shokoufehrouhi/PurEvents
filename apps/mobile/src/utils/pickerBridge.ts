// Minimal in-memory bridge so a pushed picker screen (e.g. the full-screen
// category picker) can hand its selection back to the screen that opened
// it, without a global store. Works because both screens live in the same
// JS runtime — the "opener" awaits a promise that the picker resolves.
type Listener = (value: string) => void;

let pendingListener: Listener | null = null;

export function awaitPick(): Promise<string> {
  return new Promise((resolve) => {
    pendingListener = (value) => {
      resolve(value);
      pendingListener = null;
    };
  });
}

export function resolvePick(value: string) {
  pendingListener?.(value);
}
