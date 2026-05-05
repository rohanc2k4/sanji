import { describe, expect, it } from 'vitest';
import { computeMascotState, type MascotInputs } from './useMascotState';

const baseTime = new Date('2026-05-05T12:00:00').getTime(); // noon (idle bucket)

const idle: MascotInputs = {
  chatStreaming: false,
  lastError: null,
  nowMs: baseTime,
};

describe('computeMascotState', () => {
  it('streaming → active', () => {
    expect(computeMascotState({ ...idle, chatStreaming: true })).toBe('active');
  });

  it('quota beats streaming (sticky)', () => {
    expect(
      computeMascotState({ ...idle, chatStreaming: true, lastError: 'quota' }),
    ).toBe('quota');
  });

  it('quota beats time-of-day', () => {
    expect(
      computeMascotState({ ...idle, lastError: 'quota', nowMs: at('07:30') }),
    ).toBe('quota');
  });

  it('rate-limit → error when not streaming', () => {
    expect(computeMascotState({ ...idle, lastError: 'rate-limit' })).toBe('error');
  });

  it('streaming wins over rate-limit', () => {
    expect(
      computeMascotState({ ...idle, chatStreaming: true, lastError: 'rate-limit' }),
    ).toBe('active');
  });

  it('morning bucket: 06:00–08:59', () => {
    expect(computeMascotState({ ...idle, nowMs: at('06:30') })).toBe('morning');
    expect(computeMascotState({ ...idle, nowMs: at('08:59') })).toBe('morning');
    expect(computeMascotState({ ...idle, nowMs: at('09:00') })).toBe('idle');
  });

  it('afternoon bucket: 13:00–14:59', () => {
    expect(computeMascotState({ ...idle, nowMs: at('13:00') })).toBe('afternoon');
    expect(computeMascotState({ ...idle, nowMs: at('14:30') })).toBe('afternoon');
    expect(computeMascotState({ ...idle, nowMs: at('15:00') })).toBe('idle');
  });

  it('evening bucket: 17:00–21:59', () => {
    expect(computeMascotState({ ...idle, nowMs: at('17:30') })).toBe('evening');
    expect(computeMascotState({ ...idle, nowMs: at('21:59') })).toBe('evening');
    expect(computeMascotState({ ...idle, nowMs: at('22:00') })).toBe('idle');
  });

  it('outside all buckets → idle', () => {
    expect(computeMascotState({ ...idle, nowMs: at('03:00') })).toBe('idle');
  });
});

function at(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(2026, 4, 5, h!, m!).getTime();
}
