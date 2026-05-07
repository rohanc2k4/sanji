import { useState, type KeyboardEvent } from 'react';
import { ArrowUp, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export interface ComposerProps {
  onSubmit: (message: string, model: string) => void;
  onAbort: () => void;
  streaming: boolean;
  // Selected model lives in the chat header (ChatShell) now and is passed
  // down so each send fires with the picker's current value. The Composer
  // no longer owns the model selector itself.
  model: string;
}

export function Composer({ onSubmit, onAbort, streaming, model }: ComposerProps) {
  const [text, setText] = useState('');

  function tryFire() {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;
    onSubmit(trimmed, model);
    setText('');
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      tryFire();
    }
  }

  return (
    <div className="shrink-0 border-t border-border bg-background px-6 py-3">
      <div className="mx-auto flex max-w-3xl flex-col rounded-lg border border-border bg-card transition-colors focus-within:border-ring/60">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything…   ⌘↵ to send"
          rows={2}
          className="min-h-12 resize-none border-0 bg-transparent px-3 py-2.5 text-sm leading-relaxed shadow-none focus-visible:border-0 focus-visible:ring-0"
        />
        <div className="flex items-center justify-end gap-2 border-t border-border/50 px-2 py-1.5">
          {streaming ? (
            <Button size="sm" variant="outline" onClick={onAbort}>
              <Square className="size-3.5" />
              Stop
            </Button>
          ) : (
            <Button size="sm" onClick={tryFire} disabled={!text.trim()}>
              <ArrowUp className="size-3.5" />
              Send
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
