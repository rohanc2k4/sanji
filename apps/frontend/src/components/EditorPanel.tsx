import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { getNote, putNote } from '@/api/notes';
import { isApiError } from '@sanji/shared';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export interface EditorPanelProps {
  path: string | null;
  onClose: () => void;
}

export function EditorPanel({ path, onClose }: EditorPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const dirtyRef = useRef(false);
  const pathRef = useRef<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    pathRef.current = path;
  }, [path]);

  useEffect(() => {
    dirtyRef.current = dirty;
  }, [dirty]);

  async function save() {
    const view = viewRef.current;
    const currentPath = pathRef.current;
    if (!view || !currentPath) return;
    const body = view.state.doc.toString();
    try {
      const res = await putNote(currentPath, body);
      setDirty(false);
      dirtyRef.current = false;
      toast.success(`Saved ${res.path}`, {
        description: res.snapshot ? `Previous version snapshot at ${res.snapshot}` : 'New file created.',
      });
    } catch (err) {
      const msg = isApiError(err) ? err.message : err instanceof Error ? err.message : String(err);
      toast.error('Save failed', { description: msg });
    }
  }

  useEffect(() => {
    if (!path || !containerRef.current) return;

    let cancelled = false;
    setDirty(false);
    dirtyRef.current = false;

    (async () => {
      let body = '';
      try {
        const note = await getNote(path);
        if (cancelled) return;
        body = note.body;
      } catch (err) {
        if (cancelled) return;
        if (!(isApiError(err) && err.code === 'HTTP_404')) {
          const msg = isApiError(err) ? err.message : err instanceof Error ? err.message : String(err);
          toast.error('Could not load note', { description: msg });
        }
      }
      if (cancelled || !containerRef.current) return;
      const state = EditorState.create({
        doc: body,
        extensions: [
          history(),
          markdown(),
          EditorView.lineWrapping,
          keymap.of([
            {
              key: 'Mod-s',
              preventDefault: true,
              run: () => {
                void save();
                return true;
              },
            },
            indentWithTab,
            ...historyKeymap,
            ...defaultKeymap,
          ]),
          EditorView.updateListener.of((u) => {
            if (u.docChanged) setDirty(true);
          }),
          EditorView.theme({
            '&': {
              backgroundColor: 'transparent',
              color: 'var(--foreground)',
              fontSize: '14px',
              height: '100%',
            },
            '.cm-scroller': {
              fontFamily: 'var(--font-mono)',
              lineHeight: '1.55',
              padding: '12px 16px',
            },
            '.cm-content': { caretColor: 'var(--primary)' },
            '.cm-cursor': { borderLeftColor: 'var(--primary)' },
            '.cm-focused': { outline: 'none' },
            '.cm-selectionBackground, ::selection': { backgroundColor: 'var(--accent)' },
            '.cm-activeLine': { backgroundColor: 'transparent' },
          }),
        ],
      });
      const view = new EditorView({ state, parent: containerRef.current });
      viewRef.current = view;
    })();

    return () => {
      cancelled = true;
      viewRef.current?.destroy();
      viewRef.current = null;
    };
  }, [path]);

  function requestClose() {
    if (dirtyRef.current) setConfirmOpen(true);
    else onClose();
  }

  function discardAndClose() {
    setConfirmOpen(false);
    setDirty(false);
    dirtyRef.current = false;
    onClose();
  }

  if (!path) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
          <span className="text-xs text-muted-foreground/70">No file selected</span>
          <Button variant="ghost" size="icon-xs" onClick={onClose} aria-label="Close editor">
            <X />
          </Button>
        </div>
        <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-muted-foreground/70">
          Pick a note from the sidebar.
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border px-4">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-mono text-xs text-foreground">{path}</span>
          {dirty && (
            <span
              className="size-1.5 shrink-0 rounded-full bg-primary"
              aria-label="Unsaved changes"
              title="Unsaved changes"
            />
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void save()}
            disabled={!dirty}
            className="text-xs"
            aria-label="Save (⌘S)"
          >
            Save
          </Button>
          <Button variant="ghost" size="icon-xs" onClick={requestClose} aria-label="Close editor">
            <X />
          </Button>
        </div>
      </div>
      <div ref={containerRef} className="flex-1 overflow-auto" />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes in <span className="font-mono">{path}</span>. Closing will lose them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep editing</AlertDialogCancel>
            <AlertDialogAction
              onClick={discardAndClose}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
