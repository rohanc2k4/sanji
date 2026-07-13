import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ChatShell } from './components/ChatShell';
import { Toaster } from './components/ui/sonner';
import { OnboardingFlow } from './onboarding/OnboardingFlow';
import { AddSourceModal } from './components/AddSourceModal';
import { IngestStatusPanel } from './components/IngestStatusPanel';
import { applyIngestEvent, type StatusRow } from './components/ingestStatus';
import { ingestFile, ingestText } from './api/ingest';
import { getConfig } from './api/config';
import { isApiError, type ConfigDto } from '@sanji/shared';

type Boot = 'loading' | 'onboarding' | 'ready';

export default function App() {
  const [boot, setBoot] = useState<Boot>('loading');
  const [config, setConfig] = useState<ConfigDto | null>(null);

  useEffect(() => {
    let cancelled = false;
    getConfig()
      .then((cfg) => {
        if (cancelled) return;
        setConfig(cfg);
        setBoot('ready');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (isApiError(err) && err.code === 'HTTP_404') setBoot('onboarding');
        else setBoot('onboarding');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleOnboardingComplete() {
    try {
      const cfg = await getConfig();
      setConfig(cfg);
    } catch {
      // Fall through with null config; useChat's defaults take over.
    }
    setBoot('ready');
  }

  return (
    <>
      {boot === 'loading' && <Loading />}
      {boot === 'onboarding' && <OnboardingFlow onComplete={handleOnboardingComplete} />}
      {boot === 'ready' && <ChatRoot config={config} />}
      <Toaster />
    </>
  );
}

function Loading() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background text-sm text-muted-foreground">
      Loading…
    </div>
  );
}

function ChatRoot({ config }: { config: ConfigDto | null }) {
  const [editorPath, setEditorPath] = useState<string | null>(null);
  const [rows, setRows] = useState<StatusRow[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0);
  const ctrls = useRef<Map<string, AbortController>>(new Map());

  function bumpSidebar() {
    setSidebarRefreshKey((k) => k + 1);
  }

  function handleRenamed(from: string, to: string) {
    setEditorPath((curr) => (curr === from ? to : curr));
    bumpSidebar();
  }

  function handleDeleted(path: string) {
    setEditorPath((curr) => (curr === path ? null : curr));
    bumpSidebar();
  }

  function handleFolderMoved(from: string, to: string) {
    setEditorPath((curr) => {
      if (curr === from || (curr !== null && curr.startsWith(`${from}/`))) {
        return `${to}${curr.slice(from.length)}`;
      }
      return curr;
    });
    bumpSidebar();
  }

  function handleFolderDeleted(path: string) {
    setEditorPath((curr) => {
      if (curr === path || (curr !== null && curr.startsWith(`${path}/`))) return null;
      return curr;
    });
    bumpSidebar();
  }

  async function startIngestFiles(files: File[]) {
    for (const f of files) {
      const ctrl = new AbortController();
      try {
        for await (const ev of ingestFile(f, ctrl.signal)) {
          if (ev.kind === 'queued') ctrls.current.set(ev.fileId, ctrl);
          setRows((prev) => applyIngestEvent(prev, ev));
          if (ev.kind === 'done') bumpSidebar();
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') continue;
        const msg =
          isApiError(err) ? err.message : err instanceof Error ? err.message : String(err);
        toast.error(`Ingestion failed: ${f.name}`, { description: msg });
      }
    }
  }

  async function startIngestText(input: { title: string; content: string }) {
    const ctrl = new AbortController();
    try {
      for await (const ev of ingestText(input, ctrl.signal)) {
        if (ev.kind === 'queued') ctrls.current.set(ev.fileId, ctrl);
        setRows((prev) => applyIngestEvent(prev, ev));
        if (ev.kind === 'done') bumpSidebar();
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Ingestion failed: ${input.title}`, { description: msg });
    }
  }

  function dismissRow(fileId: string) {
    setRows((prev) => prev.filter((r) => r.fileId !== fileId));
    ctrls.current.delete(fileId);
  }

  function cancelRow(fileId: string) {
    const ctrl = ctrls.current.get(fileId);
    if (!ctrl) return;
    // Local terminal state: when we abort the fetch, the SSE reader stops
    // reading from the response body, so the backend's "Cancelled by user"
    // error event never reaches the client. Without this synthesized
    // local event, the row stays at 'extracting' or 'rewriting' with a
    // forever spinner. The synthesized event's shape mirrors the
    // backend's cancellation error so applyIngestEvent treats the row
    // identically (terminal phase: 'error', errorMessage shown to user).
    ctrl.abort();
    ctrls.current.delete(fileId);
    setRows((prev) => {
      const row = prev.find((r) => r.fileId === fileId);
      if (!row) return prev;
      // Already terminal: don't overwrite.
      if (row.phase === 'done' || row.phase === 'skipped' || row.phase === 'error') {
        return prev;
      }
      return prev.map((r) =>
        r.fileId === fileId
          ? { ...r, phase: 'error' as const, errorMessage: 'Cancelled by user.' }
          : r,
      );
    });
  }

  return (
    <>
      <ChatShell
        editorPath={editorPath}
        onOpenEditor={setEditorPath}
        onCloseEditor={() => setEditorPath(null)}
        onFilesDropped={startIngestFiles}
        onAddSource={() => setModalOpen(true)}
        onNoteSaved={bumpSidebar}
        onNoteRenamed={handleRenamed}
        onNoteDeleted={handleDeleted}
        onFolderMoved={handleFolderMoved}
        onFolderDeleted={handleFolderDeleted}
        sidebarRefreshKey={sidebarRefreshKey}
        config={config}
      />
      <IngestStatusPanel
        rows={rows}
        onDismiss={dismissRow}
        onCancel={cancelRow}
        onOpenNote={setEditorPath}
      />
      <AddSourceModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onUploadFiles={startIngestFiles}
        onSubmitText={startIngestText}
      />
    </>
  );
}
