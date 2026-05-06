import { useEffect, useState } from 'react';
import { ChatShell } from './components/ChatShell';
import { Toaster } from './components/ui/sonner';
import { OnboardingFlow } from './onboarding/OnboardingFlow';
import { getConfig } from './api/config';
import { isApiError } from '@sanji/shared';

type Boot = 'loading' | 'onboarding' | 'ready';

export default function App() {
  const [boot, setBoot] = useState<Boot>('loading');

  useEffect(() => {
    let cancelled = false;
    getConfig()
      .then(() => {
        if (!cancelled) setBoot('ready');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        // 404 = no config yet → onboarding. Other errors also fall through to
        // onboarding for v0.1; refining "backend unreachable" UI is later polish.
        if (isApiError(err) && err.code === 'HTTP_404') setBoot('onboarding');
        else setBoot('onboarding');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      {boot === 'loading' && <Loading />}
      {boot === 'onboarding' && <OnboardingFlow onComplete={() => setBoot('ready')} />}
      {boot === 'ready' && <ChatRoot />}
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

function ChatRoot() {
  const [editorPath, setEditorPath] = useState<string | null>(null);
  return (
    <ChatShell
      editorPath={editorPath}
      onOpenEditor={setEditorPath}
      onCloseEditor={() => setEditorPath(null)}
      onFilesDropped={() => {}}
    />
  );
}
