import { useEffect } from "react";
import { createPortal } from "react-dom";
import { TOAST_SUCCESS_DURATION_MS } from "../constants";
import type { ToastProps, ToastsProps } from "../types/ui";
import { AlertIcon, CheckIcon, CloseIcon } from "./Icons";


/** Floating feedback for page actions. Success notes fade on their own; errors stay until dismissed. */
export function Toasts({ error, status, onDismissError, onDismissStatus }: ToastsProps) {
  useEffect(() => {
    if (!status) return;
    const timer = window.setTimeout(onDismissStatus, TOAST_SUCCESS_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [status, onDismissStatus]);

  if (typeof document === "undefined" || (!error && !status)) return null;

  return createPortal(
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-end gap-2 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:w-96">
      {error ? (
        <Toast tone="error" message={error} onDismiss={onDismissError} />
      ) : null}
      {status ? (
        <Toast tone="success" message={status} onDismiss={onDismissStatus} />
      ) : null}
    </div>,
    document.body,
  );
}

function Toast({ tone, message, onDismiss }: ToastProps) {
  const isError = tone === "error";
  return (
    <div
      role={isError ? "alert" : "status"}
      className={`pointer-events-auto flex w-full items-start gap-3 rounded-xl border bg-surface p-3.5 pr-2.5 shadow-xl shadow-black/20 animate-fade-in-up ${
        isError ? "border-danger/40" : "border-line-strong"
      }`}
    >
      <span className={`mt-0.5 shrink-0 ${isError ? "text-danger" : "text-success"}`}>
        {isError ? <AlertIcon className="size-4" /> : <CheckIcon className="size-4" />}
      </span>
      <p className="min-w-0 flex-1 text-[13px] leading-relaxed break-words text-fg">{message}</p>
      <button type="button" onClick={onDismiss} className="icon-btn -my-1 size-7" aria-label="Dismiss">
        <CloseIcon className="size-3.5" />
      </button>
    </div>
  );
}
