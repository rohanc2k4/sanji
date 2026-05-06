import type { ChatEvent } from '@sanji/shared';

export function chatEventToSse(ev: ChatEvent): string {
  return `event: ${ev.type}\ndata: ${JSON.stringify(ev)}\n\n`;
}
