import { useEffect, useRef, useState } from 'react';
import { FileText, Folder } from 'lucide-react';

interface NewItemRowProps {
  indent: number;
  itemKind: 'note' | 'folder';
  onCommit: (draft: string) => void;
  onCancel: () => void;
}

export function NewItemRow({ indent, itemKind, onCommit, onCancel }: NewItemRowProps) {
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const Icon = itemKind === 'folder' ? Folder : FileText;
  const iconTestId = itemKind === 'folder' ? 'icon-folder' : 'icon-note';

  return (
    <div
      style={{ paddingLeft: indent }}
      className="flex h-7 w-full items-center gap-1.5 rounded pr-2 text-sm"
    >
      <Icon data-testid={iconTestId} className="size-3.5 shrink-0 text-muted-foreground/60" />
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); onCommit(draft); }
          else if (e.key === 'Escape') { e.preventDefault(); onCancel(); }
        }}
        onBlur={() => onCommit(draft)}
        placeholder={itemKind === 'folder' ? 'folder name' : 'note name'}
        className="h-7 min-w-0 flex-1 rounded border-0 bg-background/60 px-1 text-sm text-foreground outline-none focus:bg-background focus:ring-1 focus:ring-ring"
      />
    </div>
  );
}
