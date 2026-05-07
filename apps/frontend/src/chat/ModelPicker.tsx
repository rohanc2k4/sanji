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

export interface ModelOption {
  id: string;
  label: string;
}

export const MODEL_OPTIONS: readonly ModelOption[] = [
  { id: 'claude-opus-4-7', label: 'Opus 4.7' },
  { id: 'claude-sonnet-4-6', label: 'Sonnet 4.6' },
  { id: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5' },
] as const;

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
