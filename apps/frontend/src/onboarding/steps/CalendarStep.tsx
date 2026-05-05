import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import type { StepProps } from './VaultStep';

export function CalendarStep({ state, dispatch }: StepProps) {
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');

  function onAdd() {
    if (!label.trim() || !url.trim()) return;
    dispatch({ type: 'add-calendar-url', url: { label: label.trim(), url: url.trim() } });
    setLabel('');
    setUrl('');
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="cal-label" className="text-xs">
            Label
          </Label>
          <Input
            id="cal-label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Personal"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cal-url" className="text-xs">
            iCal URL
          </Label>
          <div className="flex gap-2">
            <Input
              id="cal-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onAdd();
              }}
              placeholder="https://calendar.google.com/calendar/ical/.../basic.ics"
              className="font-mono text-xs"
            />
            <Button onClick={onAdd} disabled={!label.trim() || !url.trim()}>
              <Plus />
              Add
            </Button>
          </div>
        </div>
      </div>

      {state.calendarUrls.length > 0 && (
        <ul className="space-y-1.5">
          {state.calendarUrls.map((u, i) => (
            <li
              key={`${u.label}-${i}`}
              className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-foreground">{u.label}</div>
                <div className="truncate font-mono text-xs text-muted-foreground">{u.url}</div>
              </div>
              <Button
                size="icon-xs"
                variant="ghost"
                onClick={() => dispatch({ type: 'remove-calendar-url', index: i })}
                aria-label={`Remove ${u.label}`}
              >
                <X />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-muted-foreground">
        Calendars are optional. Skip to continue without; you can add more later.
      </p>
    </div>
  );
}
