import { useEffect, useRef, useState } from "react";
import type { PageFileDropOptions } from "../types/upload";
import { hasDraggedFiles } from "../utils/fileDrop";

/** Stage file drops anywhere on the page while this upload form is mounted. */
export function usePageFileDrop({ enabled, onFile }: PageFileDropOptions) {
  const [isDragging, setIsDragging] = useState(false);
  const onFileRef = useRef(onFile);
  onFileRef.current = onFile;

  useEffect(() => {
    let dragDepth = 0;

    function resetDrag() {
      dragDepth = 0;
      setIsDragging(false);
    }

    function handleDragEnter(event: DragEvent) {
      if (!hasDraggedFiles(event.dataTransfer)) return;
      event.preventDefault();
      if (!enabled) return;
      dragDepth += 1;
      setIsDragging(true);
    }

    function handleDragLeave() {
      dragDepth = Math.max(0, dragDepth - 1);
      if (dragDepth === 0) setIsDragging(false);
    }

    function handleDragOver(event: DragEvent) {
      if (!hasDraggedFiles(event.dataTransfer)) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = enabled ? "copy" : "none";
      if (enabled) setIsDragging(true);
    }

    function handleDrop(event: DragEvent) {
      resetDrag();
      if (!hasDraggedFiles(event.dataTransfer)) return;
      // Also prevent file navigation while the form is busy or disabled.
      event.preventDefault();
      const file = event.dataTransfer?.files[0];
      if (enabled && file) onFileRef.current(file);
    }

    resetDrag();
    // Capture drops even when a nested control stops event propagation.
    window.addEventListener("dragenter", handleDragEnter, true);
    window.addEventListener("dragleave", handleDragLeave, true);
    window.addEventListener("dragover", handleDragOver, true);
    window.addEventListener("drop", handleDrop, true);
    window.addEventListener("dragend", resetDrag);
    window.addEventListener("blur", resetDrag);
    return () => {
      window.removeEventListener("dragenter", handleDragEnter, true);
      window.removeEventListener("dragleave", handleDragLeave, true);
      window.removeEventListener("dragover", handleDragOver, true);
      window.removeEventListener("drop", handleDrop, true);
      window.removeEventListener("dragend", resetDrag);
      window.removeEventListener("blur", resetDrag);
    };
  }, [enabled]);

  return enabled && isDragging;
}
