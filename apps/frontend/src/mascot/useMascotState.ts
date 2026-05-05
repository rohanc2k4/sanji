import { useEffect, useState } from 'react';
import type { MascotQuoteState } from './quotes';

export type MascotState = MascotQuoteState;

export interface MascotInputs {
  chatStreaming: boolean;
  lastError: 'rate-limit' | 'quota' | null;
  nowMs: number;
}

/**
 * Pure state computation. Order of precedence (highest first):
 *   1. quota error (sticky — caller must clear)
 *   2. chat streaming → active
 *   3. rate-limit error
 *   4. time-of-day: morning (6–9), afternoon (13–15), evening (17–22)
 *   5. idle
 */
export function computeMascotState(inputs: MascotInputs): MascotState {
  if (inputs.lastError === 'quota') return 'quota';
  if (inputs.chatStreaming) return 'active';
  if (inputs.lastError === 'rate-limit') return 'error';
  const hour = new Date(inputs.nowMs).getHours();
  if (hour >= 6 && hour < 9) return 'morning';
  if (hour >= 13 && hour < 15) return 'afternoon';
  if (hour >= 17 && hour < 22) return 'evening';
  return 'idle';
}

/**
 * React hook that re-evaluates state once a minute so time-of-day buckets
 * advance without input changes.
 */
export function useMascotState(inputs: Omit<MascotInputs, 'nowMs'>): MascotState {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  return computeMascotState({ ...inputs, nowMs: now });
}
