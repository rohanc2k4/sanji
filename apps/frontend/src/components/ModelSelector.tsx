import { useEffect, useState } from 'react';
import { getConfig } from '@/api/config';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export interface ModelSelectorProps {
  value: string;
  onChange: (model: string) => void;
}

interface ModelOption {
  id: string;
  label: string;
}

const FALLBACK: ModelOption[] = [
  { id: 'claude-sonnet-4-6', label: 'Sonnet 4.6' },
  { id: 'claude-opus-4-7', label: 'Opus 4.7' },
];

function shortLabel(id: string): string {
  return id
    .replace(/^claude-/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ModelSelector({ value, onChange }: ModelSelectorProps) {
  const [options, setOptions] = useState<ModelOption[]>(FALLBACK);

  useEffect(() => {
    let cancelled = false;
    getConfig()
      .then((cfg) => {
        if (cancelled) return;
        const seen = new Set<string>();
        const list: ModelOption[] = [];
        for (const id of [cfg.models.default, cfg.models.heavy]) {
          if (seen.has(id)) continue;
          seen.add(id);
          list.push({ id, label: shortLabel(id) });
        }
        if (list.length > 0) setOptions(list);
      })
      .catch(() => {
        /* keep fallback */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger size="sm" className="h-7 gap-1 px-2 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((opt) => (
          <SelectItem key={opt.id} value={opt.id} className="text-xs">
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
