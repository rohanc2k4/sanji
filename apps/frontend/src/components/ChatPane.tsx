export function ChatPane() {
  return (
    <div className="relative flex flex-1 items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div className="mb-3 text-4xl" aria-hidden>🐈</div>
        <div className="text-base font-medium text-foreground">
          Chat pane
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          T14 lands streaming chat with citation chips and tool-call pills.
          The mascot moves to the bottom-right corner of this pane in T18.
        </p>
      </div>
    </div>
  );
}
