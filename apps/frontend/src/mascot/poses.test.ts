import { describe, expect, it } from 'vitest';
import { POSES, poseNameFor, computeMotion, type PoseName, type Motion } from './poses';

const STATES = ['idle', 'active', 'error', 'quota', 'morning', 'afternoon', 'evening'] as const;
const SUBMOODS = ['snooze', 'energetic', 'groom', 'idle'] as const;
const MOTIONS: Motion[] = ['breathe', 'stretch', 'hop', 'sink', 'lick', 'tilt'];
const EYES = ['open', 'closed', 'wide', 'half', 'worried'];
const MOUTHS = ['none', 'w', 'smile', 'tongue', 'frown'];

describe('POSES table', () => {
  it('has a valid pose for every PoseName', () => {
    const names: PoseName[] = [
      'idle', 'snooze', 'energetic', 'groom', 'active', 'error', 'quota', 'morning', 'afternoon', 'evening',
    ];
    for (const n of names) {
      const p = POSES[n];
      expect(p).toBeDefined();
      expect(MOTIONS).toContain(p.motion);
      expect(EYES).toContain(p.eye);
      expect(MOUTHS).toContain(p.mouth);
    }
  });

  it('keeps the three refinements: idle stretches, groom licks, active tilts', () => {
    expect(POSES.idle.motion).toBe('stretch');
    expect(POSES.groom.motion).toBe('lick');
    expect(POSES.active.motion).toBe('tilt');
  });
});

describe('poseNameFor', () => {
  it('uses the sub-mood only when the machine state is idle', () => {
    expect(poseNameFor('idle', 'energetic')).toBe('energetic');
    expect(poseNameFor('idle', 'idle')).toBe('idle');
    expect(poseNameFor('active', 'energetic')).toBe('active');
    expect(poseNameFor('morning', 'snooze')).toBe('morning');
  });

  it('every machine state and every sub-mood resolves to a known pose', () => {
    for (const s of STATES) {
      for (const m of SUBMOODS) {
        expect(POSES[poseNameFor(s, m)]).toBeDefined();
      }
    }
  });
});

describe('computeMotion', () => {
  it('returns a finite, fully-populated FrontMotion for every pose at several times', () => {
    for (const name of Object.keys(POSES) as PoseName[]) {
      for (const t of [0, 0.5, 3.3, 10.1]) {
        const m = computeMotion(POSES[name], t);
        expect(typeof m.bob).toBe('number');
        expect(typeof m.swayScale).toBe('number');
        expect(typeof m.tilt).toBe('number');
        expect(typeof m.lick).toBe('number');
        expect(typeof m.headDip).toBe('number');
        expect(typeof m.pawReach).toBe('number');
        expect(typeof m.groomPaw).toBe('boolean');
        expect(Number.isFinite(m.bob)).toBe(true);
      }
    }
  });

  it('groom raises the paw; energetic exaggerates the sway', () => {
    expect(computeMotion(POSES.groom, 0.5).groomPaw).toBe(true);
    expect(computeMotion(POSES.energetic, 0.5).swayScale).toBeGreaterThan(1);
  });

  it('active produces a non-zero head tilt across a short window', () => {
    const tilts = [0.1, 0.2, 0.3, 0.4].map((t) => Math.abs(computeMotion(POSES.active, t).tilt));
    expect(Math.max(...tilts)).toBeGreaterThan(0);
  });
});
