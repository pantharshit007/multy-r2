import { useEffect, useRef } from "react";
import type { DialogOutsideClickOptions } from "../types/dialog";

/** Native dialog backdrops target the dialog itself, so test its bounds too. */
export function useDialogOutsideClick({ dialogRef, enabled, onClose }: DialogOutsideClickOptions) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!enabled) return;
    let startedOutside = false;

    function isOutside(event: MouseEvent) {
      const dialog = dialogRef.current;
      if (!dialog?.open) return false;
      if (event.target instanceof Node && event.target !== dialog && dialog.contains(event.target)) return false;
      const bounds = dialog.getBoundingClientRect();
      return event.clientX < bounds.left || event.clientX > bounds.right ||
        event.clientY < bounds.top || event.clientY > bounds.bottom;
    }

    function onPointerDown(event: PointerEvent) {
      startedOutside = event.button === 0 && isOutside(event);
    }

    function onClick(event: MouseEvent) {
      const shouldClose = startedOutside && isOutside(event);
      startedOutside = false;
      if (shouldClose) closeRef.current();
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("click", onClick);
    };
  }, [dialogRef, enabled]);
}
