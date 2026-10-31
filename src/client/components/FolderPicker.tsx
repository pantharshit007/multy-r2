import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { invalidateFolderCache } from "../lib/folderCache";
import { useDialogOutsideClick } from "../lib/useDialogOutsideClick";
import { createEndpointFolderPath, loadEndpointFolders } from "../lib/folders";
import { matchFolders, splitFolderPath } from "../utils/folders";
import { sanitizeFolder } from "../../shared/utils/objectKeys";
import type { FolderPickerProps } from "../types/folderPicker";
import { ArrowLeftIcon, ChevronRightIcon, FolderIcon, PlusIcon } from "./Icons";

/** Browse discovered folders or choose a typed upload path without waiting for discovery. */
export function FolderPicker({ record, value, disabled, onChange, onCreated }: FolderPickerProps) {
  const [open, setOpen] = useState(false);
  const [pathInput, setPathInput] = useState("");
  const [folders, setFolders] = useState<string[]>([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const busy = useRef(false);
  const mounted = useRef(true);
  const id = useId();
  useDialogOutsideClick({
    dialogRef: dialog,
    enabled: open,
    onClose: () => { if (!busy.current) setOpen(false); },
  });
  const { parent, query, candidate } = splitFolderPath(pathInput);
  const parentExists = !parent || folders.includes(parent);
  const matches = matchFolders(folders, parent, query);
  const exists = folders.includes(candidate);
  const validCandidate = Boolean(candidate) && !candidate.includes("..") && !candidate.includes("//");
  const canCreate = validCandidate && !exists;

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (!open) return;
    dialog.current?.showModal();
    input.current?.focus();
    return () => { dialog.current?.close(); trigger.current?.focus(); };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setLoading(true);
    setFolders([]);
    setError(null);
    loadEndpointFolders(record, controller.signal, (next) => {
      if (!controller.signal.aborted) setFolders(next);
    }).then((next) => {
      if (!controller.signal.aborted) setFolders(next);
    }).catch((cause) => {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Could not load folders");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [open, record, retry]);

  useEffect(() => {
    document.getElementById(`${id}-option-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, id]);

  /** Navigate into a folder while retaining an editable full path. */
  function browse(path: string) {
    setPathInput(path ? `${path}/` : "");
    setActive(0);
    input.current?.focus();
  }

  /** Apply the upload prefix and dismiss the picker. */
  function select(path: string) {
    onChange(path);
    setOpen(false);
  }

  /** Browse folders with children, or select directly with the modifier shortcut. */
  function activate(path: string, forceSelect: boolean) {
    if (!forceSelect && (loading || folders.some((folder) => folder.startsWith(`${path}/`)))) {
      browse(path);
    } else {
      select(path);
    }
  }

  /** Create missing ancestors and select the resulting folder. */
  async function create() {
    if (!canCreate || busy.current) return;
    busy.current = true;
    setCreating(true);
    try {
      const path = sanitizeFolder(candidate);
      await createEndpointFolderPath(record, path, folders);
      if (!mounted.current) return;
      select(path);
      onCreated(path);
    } catch (cause) {
      if (mounted.current) setError(cause instanceof Error ? cause.message : "Could not create folder");
    } finally {
      busy.current = false;
      if (mounted.current) setCreating(false);
    }
  }

  return <div className="grid min-w-0 content-start gap-1.5">
    <span id={`${id}-label`} className="label">Folder</span>
    <button ref={trigger} type="button" disabled={disabled} aria-labelledby={`${id}-label ${id}-value`} aria-haspopup="dialog"
      onClick={() => { browse(value); setOpen(true); }}
      className="field flex items-center gap-2 text-left">
      <FolderIcon className="size-4 shrink-0 text-muted" />
      <span id={`${id}-value`} className={`min-w-0 flex-1 truncate ${value ? "font-mono text-[13px] text-fg" : "text-muted"}`}>{value ? `${value}/` : "Bucket root"}</span>
      <span className="shrink-0 text-xs text-subtle">Change</span>
    </button>
    {open && createPortal(<dialog ref={dialog} aria-labelledby={`${id}-title`}
      onCancel={(event) => { event.preventDefault(); if (!busy.current) setOpen(false); }}
      className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-160 overflow-hidden rounded-2xl border border-line-strong bg-surface p-0 text-fg shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm">
      <div className="flex items-center justify-between px-5 pt-5">
        <h2 id={`${id}-title`} className="text-base font-semibold tracking-tight">Choose upload folder</h2>
        <button type="button" disabled={creating} onClick={() => setOpen(false)} className="btn btn-ghost h-7 px-2 text-xs">Close <kbd className="font-sans text-subtle">Esc</kbd></button>
      </div>
      <p className="hint px-5 pt-1">
        Type <code className="code-inline">photos/</code> to browse inside photos. Keep typing, like <code className="code-inline">photos/vacation</code>, to find or create a nested folder.
      </p>
      <div className="mx-5 mt-4 flex items-center gap-2 rounded-xl border border-line bg-inset p-1.5 focus-within:border-accent">
        <button type="button" aria-label="Go to parent folder" disabled={!parent || creating} onClick={() => browse(parent.split("/").slice(0, -1).join("/"))} className="icon-btn disabled:opacity-30"><ArrowLeftIcon className="size-4" /></button>
        <input ref={input} role="combobox" aria-label="Search or create folder" aria-expanded="true" aria-controls={`${id}-list`} aria-autocomplete="list"
          aria-activedescendant={matches[active] ? `${id}-option-${active}` : undefined}
          disabled={creating} value={pathInput} placeholder="Type a folder path, e.g. photos/vacation…"
          className="min-w-0 flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-subtle focus-visible:outline-none"
          onChange={(event) => { setPathInput(event.target.value); setActive(0); }}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) return;
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              if (matches.length) setActive((current) => (current + (event.key === "ArrowDown" ? 1 : -1) + matches.length) % matches.length);
            } else if (event.key === "Enter") {
              event.preventDefault();
              if (creating) return;
              if ((event.metaKey || event.ctrlKey) && !matches[active] && validCandidate) { select(candidate); return; }
              if (matches[active]) activate(matches[active], event.metaKey || event.ctrlKey);
              else if (canCreate) void create();
              else if (!query && parentExists) select(parent);
              else if (exists) activate(candidate, event.metaKey || event.ctrlKey);
            } else if (event.key === "ArrowRight" && matches[active] && input.current?.selectionStart === pathInput.length) {
              event.preventDefault(); browse(matches[active]);
            } else if (event.key === "Backspace" && !query && parent && input.current?.selectionStart === pathInput.length && input.current?.selectionEnd === pathInput.length) {
              event.preventDefault(); browse(parent.split("/").slice(0, -1).join("/"));
            }
          }} />
      </div>
      <div className="flex items-center justify-between gap-3 px-5 py-3">
        <p className="min-w-0 truncate font-mono text-xs text-muted" title={parent || "Bucket root"}>/{parent && `${parent}/`}</p>
        <button type="button" disabled={creating || (!!parent && (parent.includes("..") || parent.includes("//")))} onClick={() => select(parent)} className="shrink-0 text-xs font-medium text-accent hover:text-accent-hover disabled:opacity-40">{parent ? "Use this folder" : "Use bucket root"}</button>
      </div>
      <div className="max-h-[40dvh] min-h-32 overflow-y-auto px-3 pb-3">
        {loading ? <p role="status" className="p-3 text-sm text-muted">Loading folders…</p> : error ? <div role="alert" className="p-3 text-sm text-danger">{error}<button type="button" onClick={() => { invalidateFolderCache(record); setRetry((current) => current + 1); }} className="ml-3 underline">Retry</button></div> : null}
        <div id={`${id}-list`} role="listbox" aria-label="Folders" aria-busy={loading}>
          {matches.map((path, index) => <div key={path} className={`flex items-center rounded-xl ${index === active ? "bg-accent/10 text-fg" : "text-muted hover:bg-raised hover:text-fg"}`}>
            <button type="button" role="option" id={`${id}-option-${index}`} aria-selected={index === active} disabled={creating}
              onFocus={() => setActive(index)} onClick={() => select(path)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  activate(path, event.metaKey || event.ctrlKey);
                }
              }}
              className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm">
              <FolderIcon className="size-4 shrink-0 text-accent" /><span className="truncate" title={path}>{parent ? path.slice(parent.length + 1) : path}</span>
            </button>
            <button type="button" aria-label={`Browse ${path}`} disabled={creating} onClick={() => browse(path)} className="icon-btn mr-1"><ChevronRightIcon className="size-4" /></button>
          </div>)}
        </div>
        {!loading && !error && !matches.length && <p className="p-3 text-sm text-muted">{query ? "No matching folders." : "No subfolders here."}</p>}
        {validCandidate && !exists && <button type="button" disabled={creating} onClick={() => select(candidate)} className="mt-2 w-full rounded-xl px-3 py-2 text-left text-sm text-muted hover:bg-raised hover:text-fg">Use “{candidate}” for upload</button>}
        {canCreate && <button type="button" disabled={creating} onClick={() => void create()} className="mt-2 flex w-full items-center gap-3 rounded-xl border border-dashed border-accent/40 px-3 py-2.5 text-left text-sm text-accent hover:bg-accent/5 disabled:opacity-50"><PlusIcon className="size-4" /><span className="min-w-0 break-all">{creating ? "Creating…" : `Create & select “${candidate}”`}</span></button>}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line bg-inset px-5 py-3 text-xs text-muted [&_kbd]:rounded-md [&_kbd]:border [&_kbd]:border-line [&_kbd]:bg-raised [&_kbd]:px-1.5 [&_kbd]:py-0.5 [&_kbd]:font-sans [&_kbd]:text-fg">
        <span className="inline-flex items-center gap-1.5"><kbd>↑</kbd><kbd>↓</kbd> Navigate</span>
        <span className="inline-flex items-center gap-1.5" title="Open folders with subfolders; otherwise select. Create a new path when there is no match."><kbd>Enter</kbd> Open / select</span>
        <span className="inline-flex items-center gap-1.5" title="Select the highlighted folder without opening it"><kbd>⌘/Ctrl ↵</kbd> Select</span>
        <span className="inline-flex items-center gap-1.5" title="Go up a folder when the cursor is after a trailing slash"><kbd>Backspace</kbd> Back</span>
        <span className="inline-flex items-center gap-1.5"><kbd>Esc</kbd> Close</span>
      </div>
    </dialog>, document.body)}
  </div>;
}
