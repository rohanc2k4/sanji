export type SubMood = 'snooze' | 'energetic' | 'groom' | 'idle';

export interface CyclerState {
  mood: SubMood;
  nextAtMs: number;
}

export const SUB_MOODS: SubMood[] = ['snooze', 'energetic', 'groom', 'idle'];
export const DWELL_MIN_MS = 8_000;
export const DWELL_MAX_MS = 16_000;

function dwell(rng: () => number): number {
  return DWELL_MIN_MS + rng() * (DWELL_MAX_MS - DWELL_MIN_MS);
}

function pickDifferent(prev: SubMood, rng: () => number): SubMood {
  const options = SUB_MOODS.filter((m) => m !== prev);
  return options[Math.floor(rng() * options.length)]!;
}

export function initCycler(nowMs: number, rng: () => number): CyclerState {
  const mood = SUB_MOODS[Math.floor(rng() * SUB_MOODS.length)]!;
  return { mood, nextAtMs: nowMs + dwell(rng) };
}

// Pure advance: before nextAtMs, the state is returned unchanged (same ref);
// at or after it, switch to a different sub-mood and schedule the next switch.
export function advanceCycler(state: CyclerState, nowMs: number, rng: () => number): CyclerState {
  if (nowMs < state.nextAtMs) return state;
  return { mood: pickDifferent(state.mood, rng), nextAtMs: nowMs + dwell(rng) };
}
