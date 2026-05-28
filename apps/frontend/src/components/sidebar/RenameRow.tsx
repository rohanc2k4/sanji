import { useEffect, useRef, useState } from 'react';
import { FileText } from 'lucide-react';

interface RenameRowProps {
  indent: number;
  initialDraft: string;
  onCommit: (draft: string) => void;
  onCancel: () => void;
}

export function RenameRow({ indent, initialDraft, onCommit, onCancel }: RenameRowProps) {
  const [draft, setDraft] = useState(initialDraft);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  return (
    <div
      style={{ paddingLeft: indent }}
      className="flex h-7 w-full items-center gap-1.5 rounded pr-2 text-sm"
    >
      <FileText className="size-3.5 shrink-0 text-muted-foreground/60" />
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); onCommit(draft); }
          else if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
        }}
        onBlur={() => onCommit(draft)}
        className="h-7 min-w-0 flex-1 rounded border-0 bg-background/60 px-1 text-sm text-foreground outline-none focus:bg-background focus:ring-1 focus:ring-ring"
      />
    </div>
  );
}
