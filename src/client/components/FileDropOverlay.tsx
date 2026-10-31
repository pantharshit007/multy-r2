import { createPortal } from "react-dom";
import { UploadIcon } from "./Icons";

/** Render above page stacking contexts without changing the drag target. */
export function FileDropOverlay() {
  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-100 flex items-center justify-center bg-canvas/85 p-8 backdrop-blur-sm" role="status" aria-live="polite">
      <div aria-hidden="true" className="absolute inset-4 rounded-3xl border-2 border-dashed border-accent/70 bg-accent/5 sm:inset-8" />
      <div className="relative flex max-w-lg flex-col items-center gap-4 text-center">
        <div aria-hidden="true" className="flex size-14 items-center justify-center rounded-2xl bg-accent/15 text-accent">
          <UploadIcon className="size-6" />
        </div>
        <p className="text-3xl font-semibold tracking-tight text-fg sm:text-4xl">Drop your file anywhere</p>
        <p className="text-sm text-muted">Release to select it, then press Upload.</p>
      </div>
    </div>,
    document.body,
  );
}
