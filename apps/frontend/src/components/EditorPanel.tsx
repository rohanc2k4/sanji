export interface EditorPanelProps {
  path: string | null;
}

export function EditorPanel({ path }: EditorPanelProps) {
  return (
    <div className="p-4 text-sm">
      <div className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground/70">
        Editor
      </div>
      <div className="text-xs text-muted-foreground/60">
        {path
          ? `T15 will mount CodeMirror here for ${path}.`
          : 'No file selected.'}
      </div>
    </div>
  );
}
