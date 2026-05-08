export const IDLE_MESSAGE =
  "mrr, you were gone a while so i curled up and lost the thread. purr-haps you wanna tell me what we were on? i'll fetch it back.";

export const THRESHOLD_MESSAGE =
  "we've covered a lot and my kitten brain is starting to feel fluffy. gonna paws and shake it out so i stay sharp. name what to pick back up and i'll fetch it.";

export type SessionTrigger = 'idle' | 'threshold' | 'manual';

export function sessionMessageFor(trigger: SessionTrigger): string | null {
  switch (trigger) {
    case 'idle':
      return IDLE_MESSAGE;
    case 'threshold':
      return THRESHOLD_MESSAGE;
    case 'manual':
      return null;
  }
}
