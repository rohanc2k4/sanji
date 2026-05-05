import { useState } from 'react';
import { ChatShell } from './components/ChatShell';

export default function App() {
  const [editorPath, setEditorPath] = useState<string | null>(null);

  return (
    <ChatShell
      editorPath={editorPath}
      onOpenEditor={setEditorPath}
      onCloseEditor={() => setEditorPath(null)}
    />
  );
}
