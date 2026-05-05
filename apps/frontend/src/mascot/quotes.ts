import yaml from 'js-yaml';
import raw from '../../../backend/data/sanji-quotes.yaml?raw';

export type MascotQuoteState =
  | 'idle'
  | 'active'
  | 'error'
  | 'quota'
  | 'morning'
  | 'afternoon'
  | 'evening';

interface QuotesShape {
  idle: string[];
  active: string[];
  error: string[];
  quota: string[];
  time: { morning: string[]; afternoon: string[]; evening: string[] };
}

const parsed = yaml.load(raw) as QuotesShape;

function listFor(state: MascotQuoteState): string[] {
  switch (state) {
    case 'morning':
      return parsed.time.morning;
    case 'afternoon':
      return parsed.time.afternoon;
    case 'evening':
      return parsed.time.evening;
    default:
      return parsed[state] ?? parsed.idle;
  }
}

export function pickQuote(state: MascotQuoteState, seed: number = Date.now()): string {
  const list = listFor(state);
  if (list.length === 0) return '';
  return list[seed % list.length]!;
}
