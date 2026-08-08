import { useEffect, useRef } from "react";
import { TrashIcon } from "./Icons";

interface DeleteObjectDialogProps {
  objectKey: string | null;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteObjectDialog({ objectKey, isDeleting, onCancel, onConfirm }: DeleteObjectDialogProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!objectKey) return;
    cancelButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isDeleting) onCancel();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isDeleting, objectKey, onCancel]);

  if (!objectKey) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
      <button
        className="absolute inset-0 cursor-default bg-zinc-950/75 backdrop-blur-sm"
        type="button"
        aria-label="Close deletion confirmation"
        disabled={isDeleting}
        onClick={onCancel}
      />
      <section
        className="relative w-full max-w-md animate-fade-in-up overflow-hidden rounded-3xl border border-red-500/25 bg-zinc-950 p-6 shadow-2xl shadow-black/50"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-object-title"
        aria-describedby="delete-object-description"
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-400/70 to-transparent" />
        <div className="flex size-11 items-center justify-center rounded-2xl border border-red-500/25 bg-red-500/10 text-red-300">
          <TrashIcon className="size-5" />
        </div>
        <h2 id="delete-object-title" className="mt-4 text-lg font-bold tracking-tight text-zinc-50 font-display">
          Delete this object?
        </h2>
        <p id="delete-object-description" className="mt-2 text-sm leading-6 text-zinc-400">
          This permanently removes <span className="break-all font-mono text-zinc-200">{objectKey}</span> from the selected R2 bucket.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            ref={cancelButtonRef}
            className="rounded-xl border border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100"
            type="button"
            disabled={isDeleting}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="inline-flex min-w-24 items-center justify-center gap-2 rounded-xl border border-red-400/30 bg-red-500/15 px-4 py-2 text-xs font-semibold text-red-200 transition-colors hover:border-red-300/60 hover:bg-red-500/25 disabled:cursor-wait"
            type="button"
            disabled={isDeleting}
            onClick={onConfirm}
          >
            <TrashIcon className="size-3.5" />
            {isDeleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </section>
    </div>
  );
}
