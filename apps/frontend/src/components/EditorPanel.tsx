import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { EditorState, RangeSetBuilder } from '@codemirror/state';
import {
  EditorView,
  keymap,
  ViewPlugin,
  Decoration,
  type DecorationSet,
  type ViewUpdate,
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { markdown } from '@codemirror/lang-markdown';
import { HighlightStyle, syntaxHighlighting, syntaxTree } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';

// Notion-ish styling for the markdown source: headings render at heading
// sizes, **strong** is bold, *emphasis* is italic, `inline code` uses the
// mono font with a subtle background, links pick up the accent color.
// The markdown delimiters (`**`, `#`, etc.) stay visible for v0.1 — full
// hide-markers-when-cursor-is-elsewhere is a v0.2 polish item that needs
// a custom decoration extension.
const markdownStyle = HighlightStyle.define([
  { tag: t.heading1, fontSize: '1.6em', fontWeight: '600', lineHeight: '1.2' },
  { tag: t.heading2, fontSize: '1.35em', fontWeight: '600', lineHeight: '1.25' },
  { tag: t.heading3, fontSize: '1.15em', fontWeight: '600' },
  { tag: t.heading4, fontWeight: '600' },
  { tag: t.heading5, fontWeight: '600' },
  { tag: t.heading6, fontWeight: '600' },
  { tag: t.strong, fontWeight: '700' },
  { tag: t.emphasis, fontStyle: 'italic' },
  { tag: t.strikethrough, textDecoration: 'line-through' },
  { tag: t.link, color: 'var(--primary)', textDecoration: 'underline' },
  { tag: t.url, color: 'var(--primary)' },
  { tag: t.monospace, fontFamily: 'var(--font-mono)', backgroundColor: 'var(--muted)' },
  { tag: t.quote, color: 'var(--muted-foreground)', fontStyle: 'italic' },
  { tag: t.list, color: 'var(--foreground)' },
]);

// Notion-style marker hiding: walk the markdown syntax tree and replace
// formatting markers (the # of a heading, the ** of strong, the backticks
// of inline code, the ``` and language tag of a fenced block) with empty
// decorations so they're invisible while reading. When the cursor moves
// onto the same line as a marker, the decoration is suppressed and the
// marker reappears so the user can edit it.
//
// Deliberately not in HIDE_NODES:
//   - LinkMark / URL: hiding the (url) portion of a [text](url) without
//     replacing the URL with a clickable widget would mash text into the
//     next char. v0.2 polish — needs a proper link widget extension.
//   - QuoteMark / ListMark: structural markers; the styled t.list and
//     t.quote highlights on markdownStyle already differentiate them.
const HIDE_NODES = new Set(['HeaderMark', 'EmphasisMark', 'CodeMark', 'CodeInfo']);

const hideMarkdownMarkers = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = this.compute(view);
    }
    update(u: ViewUpdate) {
      if (u.docChanged || u.selectionSet || u.viewportChanged) {
        this.decorations = this.compute(u.view);
      }
    }
    compute(view: EditorView): DecorationSet {
      const builder = new RangeSetBuilder<Decoration>();
      const head = view.state.selection.main.head;
      const cursorLine = view.state.doc.lineAt(head).number;
      const tree = syntaxTree(view.state);
      tree.iterate({
        from: view.viewport.from,
        to: view.viewport.to,
        enter: (node) => {
          if (!HIDE_NODES.has(node.type.name)) return;
          const fromLine = view.state.doc.lineAt(node.from).number;
          const toLine = view.state.doc.lineAt(node.to).number;
          // Show markers on any line the cursor's currently touching, plus
          // any line between the start and end of a multi-line construct
          // (e.g. a strong span that wraps).
          if (cursorLine >= fromLine && cursorLine <= toLine) return;
          // For HeaderMark, also hide the trailing space so headings don't
          // render with a leading space where the `# ` used to be.
          let to = node.to;
          if (node.type.name === 'HeaderMark') {
            while (
              to < view.state.doc.length &&
              view.state.doc.sliceString(to, to + 1) === ' '
            ) {
              to++;
            }
          }
          builder.add(node.from, to, Decoration.replace({}));
        },
      });
      return builder.finish();
    }
  },
  { decorations: (v) => v.decorations },
);
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
  onSaved?: (path: string) => void;
}

export function EditorPanel({ path, onClose, onSaved }: EditorPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  // dirtyRef and the dirty state are deliberately kept in sync. The Cmd-S
  // keymap below captures `save` in a closure created when the EditorView
  // is first constructed, so it always sees the original (false) `dirty`
  // value. The ref gives that closure a live read of the current state
  // without forcing the EditorView to be rebuilt on every dirty flip.
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
      onSaved?.(res.path);
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
        body = note?.body ?? '';
      } catch (err) {
        if (cancelled) return;
        const msg = isApiError(err) ? err.message : err instanceof Error ? err.message : String(err);
        toast.error('Could not load note', { description: msg });
      }
      if (cancelled || !containerRef.current) return;
      const state = EditorState.create({
        doc: body,
        extensions: [
          history(),
          markdown(),
          syntaxHighlighting(markdownStyle),
          hideMarkdownMarkers,
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
      <div
        ref={containerRef}
        key={path}
        className="flex-1 overflow-auto animate-editor-fade-in"
      />

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
