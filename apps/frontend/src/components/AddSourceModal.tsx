import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export interface AddSourceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadFiles: (files: File[]) => void;
  onSubmitText: (input: { title: string; content: string }) => void;
}

export function AddSourceModal({
  open,
  onOpenChange,
  onUploadFiles,
  onSubmitText,
}: AddSourceModalProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const canSubmitText = title.trim().length > 0 && content.trim().length > 0;

  function handleSubmitText() {
    if (!canSubmitText) return;
    onSubmitText({ title: title.trim(), content });
    setTitle('');
    setContent('');
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add a source</DialogTitle>
          <DialogDescription>
            Upload a file or paste text. Sanji will write a structured note in your inbox.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="upload">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="upload">Upload</TabsTrigger>
            <TabsTrigger value="paste">Paste</TabsTrigger>
          </TabsList>
          <TabsContent value="upload" className="space-y-3 pt-3">
            <Label htmlFor="add-source-file">Files (PDF, DOCX, txt, md)</Label>
            <Input
              id="add-source-file"
              type="file"
              multiple
              accept=".pdf,.docx,.txt,.md"
              onChange={(e) => {
                const files = [...(e.target.files ?? [])];
                if (files.length > 0) {
                  onUploadFiles(files);
                  onOpenChange(false);
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              Each file is rewritten by the bundled ingest skill and saved to{' '}
              <span className="font-mono">inbox/</span>.
            </p>
          </TabsContent>
          <TabsContent value="paste" className="space-y-3 pt-3">
            <div className="space-y-1.5">
              <Label htmlFor="add-source-title">Title</Label>
              <Input
                id="add-source-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="binary search snippet"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-source-content">Content</Label>
              <Textarea
                id="add-source-content"
                rows={10}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="font-mono text-xs"
                placeholder="paste anything…"
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSubmitText} disabled={!canSubmitText}>
                Ingest
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
