import { useCallback, useState } from 'react';
import { PanelLeftClose, PanelLeftOpen, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import type { ConfigDto } from '@sanji/shared';
import { Button } from '@/components/ui/button';
import { ChatPane } from './ChatPane';
import { Composer } from './Composer';
import { EditorPanel } from './EditorPanel';
import { SourcesSidebar } from './sidebar/SourcesSidebar';
import { ModelPicker } from '@/chat/ModelPicker';
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
  config?: ConfigDto | null;
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
  config,
}: ChatShellProps) {
  const editorOpen = editorPath !== null;
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // Sticky per chat-shell-instance. If a future "new conversation" reset
  // tears down ChatShell, the picker resets with it. Initial value reads
  // from the saved config so a user who set models.default = opus / haiku
  // in .sanji/config.toml sees their preference reflected in the picker
  // (and stops sending an unwanted per-request `model` override on every
  // chat). Falls back to Sonnet when config hasn't loaded yet.
  const [selectedModel, setSelectedModel] = useState(
    () => config?.models?.default ?? 'claude-sonnet-4-6',
  );
  const chat = useChat({
    idleMinutes: config?.chat?.autoClearIdleMinutes,
    threshold: config?.chat?.autoClearThreshold,
    modelId: selectedModel,
  });

  // /clear from the composer skips the confirm dialog because typing
  // /clear is already an explicit, deliberate action — adding a confirm
  // would feel like the app distrusts the user. The button click does
  // confirm because a stray click is much cheaper to register than
  // typing a 6-character slash.
  const handleClearFromComposer = useCallback(() => {
    chat.clear({ trigger: 'manual' });
    toast.success('Conversation cleared.');
  }, [chat]);

  const handleClearClick = useCallback(() => {
    if (chat.turns.length === 0) return; // no-op on empty conversation
    const ok = window.confirm('Clear conversation? This cannot be undone.');
    if (!ok) return;
    chat.clear({ trigger: 'manual' });
    toast.success('Conversation cleared.');
  }, [chat]);

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
          <ModelPicker value={selectedModel} onChange={setSelectedModel} />
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={handleClearClick}
            disabled={chat.turns.length === 0}
            aria-label="Clear conversation"
            title="Clear conversation"
          >
            <RotateCcw />
          </Button>
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
          <ChatPane
            turns={chat.turns}
            streaming={chat.streaming}
            elapsedSec={chat.elapsedSec}
            onFilesDropped={onFilesDropped}
          />
          {chat.thresholdWarning ? (
            <div
              role="status"
              className="flex items-center justify-between gap-3 border-t border-border bg-muted/40 px-4 py-2 text-xs text-muted-foreground"
            >
              <span>context filling up · clear to keep answers sharp</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="font-medium text-foreground underline-offset-2 hover:underline"
                  onClick={() => {
                    chat.clear({ trigger: 'threshold' });
                    toast.success('Conversation cleared.');
                  }}
                >
                  clear conversation
                </button>
                <button
                  type="button"
                  className="text-muted-foreground/60 hover:text-foreground"
                  onClick={chat.dismissThresholdWarning}
                  aria-label="Dismiss"
                >
                  dismiss
                </button>
              </div>
            </div>
          ) : null}
          <Composer
            model={selectedModel}
            onSubmit={chat.send}
            onAbort={chat.abort}
            streaming={chat.streaming}
            onClear={handleClearFromComposer}
            onActivity={chat.noteActivity}
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
