import { useEffect, useRef } from "react";
import { TrashIcon } from "./Icons";

interface DeleteObjectDialogProps {
  objectKey: string | null;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function DeleteObjectDialog({ objectKey, isDeleting, onCancel, onConfirm }: DeleteObjectDialogProps) {
  const dialogRef = useRef<HTMLElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const isDeletingRef = useRef(isDeleting);
  isDeletingRef.current = isDeleting;

  useEffect(() => {
    if (!objectKey) return;

    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cancelButtonRef.current?.focus();

    function getFocusableElements(): HTMLElement[] {
      if (!dialogRef.current) return [];
      return Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isDeletingRef.current) {
        onCancel();
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = getFocusableElements();
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey) {
        if (active === first || !dialogRef.current?.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last || !dialogRef.current?.contains(active)) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [objectKey, onCancel]);

  if (!objectKey) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="presentation">
      <button
        className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm"
        type="button"
        tabIndex={-1}
        aria-label="Close deletion confirmation"
        disabled={isDeleting}
        onClick={onCancel}
      />
      <section
        ref={dialogRef}
        className="relative w-full max-w-md animate-fade-in-up rounded-2xl border border-line-strong bg-surface p-6 shadow-2xl shadow-black/40"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-object-title"
        aria-describedby="delete-object-description"
      >
        <div className="flex size-10 items-center justify-center rounded-xl bg-danger/10 text-danger">
          <TrashIcon className="size-5" />
        </div>
        <h2 id="delete-object-title" className="mt-4 text-base font-semibold tracking-tight text-fg">
          Delete this object?
        </h2>
        <p id="delete-object-description" className="mt-1.5 text-sm leading-6 text-muted">
          This permanently removes <code className="code-inline break-all">{objectKey}</code> from the bucket. This can&apos;t be undone.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            ref={cancelButtonRef}
            className="btn btn-secondary"
            type="button"
            disabled={isDeleting}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            className="btn min-w-24 bg-danger text-white hover:bg-danger/90 disabled:cursor-wait"
            type="button"
            disabled={isDeleting}
            onClick={onConfirm}
          >
            {isDeleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </section>
    </div>
  );
}
