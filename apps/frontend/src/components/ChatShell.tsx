import { useState } from 'react';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatPane } from './ChatPane';
import { Composer } from './Composer';
import { EditorPanel } from './EditorPanel';
import { SourcesSidebar } from './SourcesSidebar';
import { useChat } from '@/hooks/useChat';

export interface ChatShellProps {
  editorPath: string | null;
  onOpenEditor: (path: string) => void;
  onCloseEditor: () => void;
  onFilesDropped: (files: File[]) => void;
  onAddSource: () => void;
  onNoteSaved?: (path: string) => void;
  onNoteRenamed?: (from: string, to: string) => void;
  sidebarRefreshKey?: number;
}

export function ChatShell({
  editorPath,
  onOpenEditor,
  onCloseEditor,
  onFilesDropped,
  onAddSource,
  onNoteSaved,
  onNoteRenamed,
  sidebarRefreshKey,
}: ChatShellProps) {
  const editorOpen = editorPath !== null;
  const chat = useChat();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen w-screen flex-col bg-background font-sans text-foreground">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-background px-2 pr-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => setSidebarCollapsed((c) => !c)}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
          </Button>
          <span className="font-mono text-foreground">sanji</span>
          <span className="text-muted-foreground/50">·</span>
          <span>localhost vault</span>
        </div>
        <div className="flex items-center gap-3 text-muted-foreground/60">
          <span className="font-mono">⌘K</span>
        </div>
      </header>

      <div className="relative flex flex-1 overflow-hidden">
        {/* Aside container animates its width 220 ↔ 0 with overflow-hidden
            so the inner sidebar (fixed at 220px) gets clipped from the
            right during the transition rather than reflowing. Same 200ms
            ease-out cadence as the editor pane slide. */}
        <aside
          className={[
            'shrink-0 overflow-hidden bg-sidebar transition-[width,border] duration-200 ease-out',
            sidebarCollapsed ? 'w-0 border-r-0' : 'w-[220px] border-r border-border',
          ].join(' ')}
        >
          <div className="h-full w-[220px]">
            <SourcesSidebar
              selectedPath={editorPath}
              onSelect={onOpenEditor}
              onAddSource={onAddSource}
              refreshKey={sidebarRefreshKey}
              onRenamed={onNoteRenamed}
            />
          </div>
        </aside>

        <main className="relative flex flex-1 flex-col bg-background">
          <ChatPane turns={chat.turns} streaming={chat.streaming} onFilesDropped={onFilesDropped} />
          <Composer
            onSubmit={chat.send}
            onAbort={chat.abort}
            streaming={chat.streaming}
          />
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
          <EditorPanel path={editorPath} onClose={onCloseEditor} onSaved={onNoteSaved} />
        </aside>
      </div>
    </div>
  );
}
