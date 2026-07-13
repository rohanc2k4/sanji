import type { EyeMode, MouthMode } from './art/head';
import type { FrontMotion } from './art/front';
import type { MascotState } from './useMascotState';
import type { SubMood } from './idleCycler';

export type PoseName =
  | 'idle' | 'snooze' | 'energetic' | 'groom'
  | 'active' | 'error' | 'quota'
  | 'morning' | 'afternoon' | 'evening';

export type ParticleKind = 'z' | 'sparkle';
export type Motion = 'breathe' | 'stretch' | 'hop' | 'sink' | 'lick' | 'tilt';

export interface Pose {
  droop: number;
  eye: EyeMode;
  mouth: MouthMode;
  motion: Motion;
  particle?: ParticleKind;
}

// Look values port art-resting.html's POSE table. Motion column is the new
// animation layer; particle column drives the corner-mascot overlay (Task 12).
export const POSES: Record<PoseName, Pose> = {
  idle:      { droop: 0,     eye: 'open',    mouth: 'w',      motion: 'stretch' },
  snooze:    { droop: 0.25,  eye: 'closed',  mouth: 'none',   motion: 'sink', particle: 'z' },
  energetic: { droop: -0.35, eye: 'wide',    mouth: 'smile',  motion: 'hop',  particle: 'sparkle' },
  groom:     { droop: 0.1,   eye: 'half',    mouth: 'tongue', motion: 'lick' },
  active:    { droop: -0.1,  eye: 'open',    mouth: 'w',      motion: 'tilt' },
  error:     { droop: 0.9,   eye: 'worried', mouth: 'frown',  motion: 'breathe' },
  quota:     { droop: 0.5,   eye: 'closed',  mouth: 'none',   motion: 'sink' },
  morning:   { droop: 0.2,   eye: 'half',    mouth: 'none',   motion: 'breathe' },
  afternoon: { droop: 0,     eye: 'half',    mouth: 'w',      motion: 'breathe' },
  evening:   { droop: -0.05, eye: 'open',    mouth: 'w',      motion: 'breathe' },
};

// Machine state -> pose name. When idle, the cycler's sub-mood chooses which
// idle pose; otherwise the state maps 1:1 (every MascotState is a PoseName).
export function poseNameFor(state: MascotState, subMood: SubMood): PoseName {
  return state === 'idle' ? subMood : state;
}

// Per-frame motion for a pose. Pure function of the pose's motion kind and the
// current time in seconds. drawFront consumes the returned FrontMotion.
export function computeMotion(pose: Pose, t: number): FrontMotion {
  const base: FrontMotion = {
    bob: 0, swayScale: 1, tilt: 0, lick: 0, headDip: 0, pawReach: 0, groomPaw: false,
  };
  switch (pose.motion) {
    case 'breathe':
      return { ...base, bob: Math.sin(t * 2) * 1.6 };
    case 'hop':
      return { ...base, bob: -Math.abs(Math.sin(t * 5.5)) * 6, swayScale: 2.2 };
    case 'sink':
      // Slow settle downward, shared by snooze and quota (the spec consolidates
      // both onto one `sink` motion). Gentler than the mockup's snooze bob so
      // quota reads as tired rather than bouncy, per Rohan's approved look.
      return { ...base, bob: Math.sin(t * 1.0) * 1.1 + 2 };
    case 'tilt':
      return { ...base, bob: Math.sin(t * 2) * 1.0, tilt: Math.sin(t * 1.5) * 0.18 };
    case 'lick': {
      // ~2s groom loop: paw rises and the tongue flicks on the down-beats.
      const flick = Math.max(0, Math.sin(t * 3));
      return { ...base, bob: Math.sin(t * 1.6), groomPaw: true, lick: flick, headDip: flick * 2 };
    }
    case 'stretch': {
      // Breathe baseline, with a ~1.2s stretch every ~10s: paws reach out and
      // the head dips, then release. `sp` ramps 0->1->0 across the window.
      const period = 10;
      const phase = t % period;
      const win = 1.2;
      const sp = phase < win ? Math.sin((phase / win) * Math.PI) : 0;
      return { ...base, bob: Math.sin(t * 2) * 1.6, pawReach: sp * 5, headDip: sp * 3 };
    }
    default:
      return base;
  }
}
