// Per-conversation model picker rendered in the chat header. Replaces the
// onboarding model step (dropped 2026-05-07): the user no longer picks a
// default upfront, they just switch per conversation in the header. The
// selected model is threaded into the chat POST body; the backend route
// pulls it off and overrides the saved-config default for that turn.
//
// Raw native <select> rather than the shadcn <Select> primitive: keeps the
// component a few lines, avoids the popover/portal machinery for what is
// effectively a three-row dropdown, and lines up with the picker contract
// (aria-label="Model", combobox role) used by callers.

import { modelsByProvider } from './model-metadata';

export interface ModelOption {
  id: string;
  label: string;
}

// v0.1: only the Anthropic adapter is wired, so the picker filters to
// provider='anthropic'. v0.2 will either drop the filter or add a
// provider sub-grouping (e.g. an optgroup per provider) once Gemini /
// OpenAI adapters land.
export const MODEL_OPTIONS: readonly ModelOption[] = modelsByProvider('anthropic').map((m) => ({
  id: m.id,
  label: m.displayName,
}));

export interface ModelPickerProps {
  value: string;
  onChange: (next: string) => void;
}

export function ModelPicker({ value, onChange }: ModelPickerProps) {
  return (
    <select
      aria-label="Model"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-7 rounded-md border border-border bg-transparent px-2 text-xs text-foreground hover:border-foreground/30 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring/60"
    >
      {MODEL_OPTIONS.map((m) => (
        <option key={m.id} value={m.id}>
          {m.label}
        </option>
      ))}
    </select>
  );
}
