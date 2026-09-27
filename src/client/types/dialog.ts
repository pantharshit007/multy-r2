import type { RefObject } from "react";

export interface DialogOutsideClickOptions {
  dialogRef: RefObject<HTMLDialogElement | null>;
  enabled: boolean;
  onClose: () => void;
}
