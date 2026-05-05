import { X } from 'lucide-react';
import { Button } from './ui/button';
import { ChatPane } from './ChatPane';
import { EditorPanel } from './EditorPanel';
import { SourcesSidebar } from './SourcesSidebar';

export interface ChatShellProps {
  editorPath: string | null;
  onCloseEditor: () => void;
}

export function ChatShell({ editorPath, onCloseEditor }: ChatShellProps) {
  const editorOpen = editorPath !== null;

  return (
    <div className="flex h-screen w-screen flex-col bg-background font-sans text-foreground">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-background px-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="font-mono text-foreground">sanji</span>
          <span className="text-muted-foreground/50">·</span>
          <span>localhost vault</span>
        </div>
        <div className="flex items-center gap-3 text-muted-foreground/60">
          <span className="font-mono">⌘K</span>
        </div>
      </header>

      <div className="relative flex flex-1 overflow-hidden">
        <aside className="w-[220px] shrink-0 border-r border-border bg-sidebar">
          <SourcesSidebar />
        </aside>

        <main className="relative flex flex-1 flex-col bg-background">
          <ChatPane />
        </main>

        <aside
          aria-hidden={!editorOpen}
          className={[
            'absolute inset-y-0 right-0 flex w-[480px] max-w-[40vw] flex-col',
            'border-l border-border bg-card shadow-md',
            'transition-transform duration-200 ease-out',
            editorOpen ? 'translate-x-0' : 'translate-x-full',
          ].join(' ')}
        >
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
            <span className="truncate font-mono text-xs text-muted-foreground">
              {editorPath ?? ''}
            </span>
            <Button variant="ghost" size="icon-xs" onClick={onCloseEditor} aria-label="Close editor">
              <X />
            </Button>
          </div>
          <div className="flex-1 overflow-auto">
            <EditorPanel path={editorPath} />
          </div>
        </aside>
      </div>
    </div>
  );
}
