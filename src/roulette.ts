export const MAX_ENTRIES = 60;
export const MAX_LABEL = 60;
export const INITIAL_ENTRIES = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elisa', 'Felipe'];
export const WHEEL_PALETTE = [
  { background: '#00b5ca', text: '#0c2f5b' },
  { background: '#0c2f5b', text: '#ffffff' },
  { background: '#42bd50', text: '#0c2f5b' },
  { background: '#80dce6', text: '#0c2f5b' },
  { background: '#2f689b', text: '#ffffff' },
  { background: '#a6e4af', text: '#0c2f5b' },
];
export const COLORS = WHEEL_PALETTE.map(color => color.background);

export type Entry = { id: string; label: string };
export type Winner = { id: string; label: string; date: string };
export type SavedState = { entries: Entry[]; history: Winner[]; removeWinner: boolean };

export function createEntries(labels: string[]): Entry[] {
  return labels.map(label => ({ id: crypto.randomUUID(), label }));
}

// Rejection sampling avoids bias when the 32-bit range isn't divisible by count.
export function randomIndex(count: number, random: () => number = () => crypto.getRandomValues(new Uint32Array(1))[0]): number {
  if (!Number.isInteger(count) || count < 1 || count > MAX_ENTRIES) throw new RangeError('Quantidade inválida.');
  const limit = Math.floor(2 ** 32 / count) * count;
  let value: number;
  do { value = random(); } while (value >= limit);
  return value % count;
}

export function targetRotation(current: number, index: number, count: number): number {
  const destination = (360 - (index + 0.5) * (360 / count)) % 360;
  return current + 360 * 5 + ((destination - current % 360 + 360) % 360);
}

export function loadState(raw: string | null): SavedState {
  const fallback = () => ({ entries: createEntries(INITIAL_ENTRIES), history: [], removeWinner: false });
  if (!raw) return fallback();
  try {
    const state = JSON.parse(raw);
    if (!Array.isArray(state.entries) || state.entries.length > MAX_ENTRIES ||
        !state.entries.every((e: Entry) => e && typeof e.id === 'string' && typeof e.label === 'string' && e.label.trim() && e.label.length <= MAX_LABEL) ||
        new Set(state.entries.map((e: Entry) => e.id)).size !== state.entries.length ||
        !Array.isArray(state.history) || state.history.length > 50 ||
        !state.history.every((w: Winner) => w && typeof w.id === 'string' && typeof w.label === 'string' && typeof w.date === 'string' && Number.isFinite(Date.parse(w.date))) ||
        typeof state.removeWinner !== 'boolean') return fallback();
    return state;
  } catch { return fallback(); }
}
