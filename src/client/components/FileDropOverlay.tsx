import { createPortal } from "react-dom";
import { UploadIcon } from "./Icons";

/** Render above page stacking contexts without changing the drag target. */
export function FileDropOverlay() {
  return createPortal(
    <div className="pointer-events-none fixed inset-0 z-100 flex items-center justify-center bg-zinc-950/80 p-8 backdrop-blur-sm" role="status" aria-live="polite">
      <div aria-hidden="true" className="absolute inset-4 rounded-3xl border-2 border-dashed border-amber-300/70 bg-amber-300/5 sm:inset-8" />
      <div className="relative flex max-w-lg flex-col items-center gap-4 text-center">
        <div aria-hidden="true" className="flex size-16 items-center justify-center rounded-2xl border border-amber-300/40 bg-amber-300/10 text-amber-300">
          <UploadIcon className="size-5" />
        </div>
        <p className="font-display text-3xl font-bold tracking-tight text-zinc-50 sm:text-5xl">Drop your file anywhere</p>
        <p className="text-sm text-zinc-400">Release to select it, then choose Upload Object.</p>
      </div>
    </div>,
    document.body,
  );
}
