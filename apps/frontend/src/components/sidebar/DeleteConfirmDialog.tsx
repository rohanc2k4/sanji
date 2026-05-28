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

export type DeleteTarget =
  | { kind: 'note'; path: string; name: string }
  | { kind: 'folder'; path: string; name: string; containedNotes: string[] };

interface DeleteConfirmDialogProps {
  target: DeleteTarget;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmDialog({
  target,
  onConfirm,
  onCancel,
}: DeleteConfirmDialogProps) {
  const isFolder = target.kind === 'folder';
  const headline = isFolder
    ? `Move ${target.name} and its ${target.containedNotes.length} notes to .sanji/trash/?`
    : `Move ${target.name} to .sanji/trash/?`;

  const preview =
    isFolder && target.containedNotes.length > 0
      ? target.containedNotes
          .slice(0, 5)
          .map((p) => p.split('/').pop())
          .join(', ') +
        (target.containedNotes.length > 5
          ? `, and ${target.containedNotes.length - 5} more`
          : '')
      : null;

  return (
    <AlertDialog open onOpenChange={(open) => { if (!open) onCancel(); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{headline}</AlertDialogTitle>
          <AlertDialogDescription>
            {preview ? `Includes: ${preview}. ` : ''}Recoverable from there.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Move to trash</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
