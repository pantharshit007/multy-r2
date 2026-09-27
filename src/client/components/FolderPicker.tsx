import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDialogOutsideClick } from "../lib/useDialogOutsideClick";
import { createEndpointFolderPath, loadEndpointFolders } from "../lib/folders";
import { matchFolders, splitFolderPath } from "../utils/folders";
import { sanitizeFolder } from "../../shared/utils/objectKeys";
import type { FolderPickerProps } from "../types/folderPicker";
import { ArrowLeftIcon, FolderIcon } from "./Icons";

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
  const canCreate = Boolean(candidate) && !exists && !candidate.includes("..") && !candidate.includes("//") && !loading && !error;

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
    setError(null);
    loadEndpointFolders(record, controller.signal).then((next) => {
      if (!controller.signal.aborted) setFolders(next);
    }).catch((cause) => {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Could not load folders");
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [open, record, retry]);

  useEffect(() => {
    document.getElementById(`${id}-option-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, id]);

  function browse(path: string) {
    setPathInput(path ? `${path}/` : "");
    setActive(0);
    input.current?.focus();
  }

  function select(path: string) {
    onChange(path);
    setOpen(false);
  }

  function activate(path: string, forceSelect: boolean) {
    if (!forceSelect && folders.some((folder) => folder.startsWith(`${path}/`))) {
      browse(path);
    } else {
      select(path);
    }
  }

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

  return <div className="grid gap-1.5">
    <span id={`${id}-label`} className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Folder / Prefix</span>
    <button ref={trigger} type="button" disabled={disabled} aria-labelledby={`${id}-label ${id}-value`} aria-haspopup="dialog"
      onClick={() => { browse(value); setOpen(true); }}
      className="flex h-10 w-full items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 text-left text-sm text-zinc-300 transition-colors hover:border-amber-300/60 focus-visible:outline-amber-300 disabled:opacity-50">
      <FolderIcon className="size-4 shrink-0 text-amber-300" />
      <span id={`${id}-value`} className="min-w-0 flex-1 truncate">{value ? `${value}/` : "Bucket root"}</span>
      <span className="text-xs text-zinc-500">Choose folder</span>
    </button>
    {open && createPortal(<dialog ref={dialog} aria-labelledby={`${id}-title`}
      onCancel={(event) => { event.preventDefault(); if (!busy.current) setOpen(false); }}
      className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-160 overflow-hidden rounded-2xl border border-zinc-700/70 bg-zinc-950 p-0 text-zinc-100 shadow-2xl backdrop:bg-black/70 backdrop:backdrop-blur-sm">
      <div className="flex items-center justify-between px-5 pt-5">
        <h2 id={`${id}-title`} className="font-display text-lg font-semibold">Choose upload folder</h2>
        <button type="button" disabled={creating} onClick={() => setOpen(false)} className="rounded-lg px-2 py-1 text-xs text-zinc-400 hover:text-white">Close <span className="ml-1 text-zinc-600">Esc</span></button>
      </div>
      <p className="px-5 pt-1 text-xs leading-relaxed text-zinc-500">
        Type <code className="text-zinc-300">photos/</code> to browse inside photos. Keep typing, like <code className="text-zinc-300">photos/vacation</code>, to find or create a nested folder.
      </p>
      <div className="mx-5 mt-4 flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/60 p-2 focus-within:border-amber-300/70">
        <button type="button" aria-label="Go to parent folder" disabled={!parent || creating} onClick={() => browse(parent.split("/").slice(0, -1).join("/"))} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 disabled:opacity-30"><ArrowLeftIcon className="size-4" /></button>
        <input ref={input} role="combobox" aria-label="Search or create folder" aria-expanded="true" aria-controls={`${id}-list`} aria-autocomplete="list"
          aria-activedescendant={matches[active] && !loading ? `${id}-option-${active}` : undefined}
          disabled={creating} value={pathInput} placeholder="Type a folder path, e.g. photos/vacation…"
          className="min-w-0 flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-zinc-600"
          onChange={(event) => { setPathInput(event.target.value); setActive(0); }}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing) return;
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              if (matches.length) setActive((current) => (current + (event.key === "ArrowDown" ? 1 : -1) + matches.length) % matches.length);
            } else if (event.key === "Enter") {
              event.preventDefault();
              if (loading || creating || error) return;
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
        <p className="min-w-0 truncate text-xs text-zinc-500" title={parent || "Bucket root"}>/{parent && `${parent}/`}</p>
        <button type="button" disabled={creating || !parentExists || loading} onClick={() => select(parent)} className="shrink-0 text-xs font-semibold text-amber-300 hover:text-amber-200 disabled:opacity-40">{parent ? "Use this folder" : "Use bucket root"}</button>
      </div>
      <div className="max-h-[40dvh] min-h-32 overflow-y-auto px-3 pb-3">
        {loading ? <p role="status" className="p-3 text-sm text-zinc-500">Loading folders…</p> : error ? <div role="alert" className="p-3 text-sm text-red-300">{error}<button type="button" onClick={() => setRetry((current) => current + 1)} className="ml-3 underline">Retry</button></div> : null}
        <div id={`${id}-list`} role="listbox" aria-label="Folders" aria-busy={loading}>
          {!loading && !error && matches.map((path, index) => <div key={path} className={`flex items-center rounded-xl ${index === active ? "bg-amber-300/10 text-amber-200" : "text-zinc-300 hover:bg-zinc-900"}`}>
            <button type="button" role="option" id={`${id}-option-${index}`} aria-selected={index === active} disabled={creating}
              onFocus={() => setActive(index)} onClick={() => select(path)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  activate(path, event.metaKey || event.ctrlKey);
                }
              }}
              className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-3 py-3 text-left text-sm focus-visible:outline-amber-300">
              <FolderIcon className="size-4 shrink-0 text-amber-300/80" /><span className="truncate" title={path}>{parent ? path.slice(parent.length + 1) : path}</span>
            </button>
            <button type="button" aria-label={`Browse ${path}`} disabled={creating} onClick={() => browse(path)} className="mr-1 rounded-lg px-3 py-2 text-zinc-500 hover:bg-zinc-800 hover:text-amber-200">→</button>
          </div>)}
        </div>
        {!loading && !error && !matches.length && <p className="p-3 text-sm text-zinc-500">{query ? "No matching folders." : "No subfolders here."}</p>}
        {canCreate && <button type="button" disabled={creating} onClick={() => void create()} className="mt-2 flex w-full items-center gap-3 rounded-xl border border-dashed border-amber-300/30 px-3 py-3 text-left text-sm text-amber-200 hover:bg-amber-300/5 disabled:opacity-50"><span>+</span><span className="min-w-0 break-all">{creating ? "Creating…" : `Create & select “${candidate}”`}</span></button>}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-zinc-800 bg-zinc-900/40 px-5 py-3 text-xs text-zinc-400 [&_kbd]:rounded-md [&_kbd]:bg-zinc-800 [&_kbd]:px-1.5 [&_kbd]:py-1 [&_kbd]:font-sans [&_kbd]:text-zinc-200">
        <span className="inline-flex items-center gap-1.5"><kbd>↑</kbd><kbd>↓</kbd> Navigate</span>
        <span className="inline-flex items-center gap-1.5" title="Open folders with subfolders; otherwise select. Create a new path when there is no match."><kbd>Enter</kbd> Open / select</span>
        <span className="inline-flex items-center gap-1.5" title="Select the highlighted folder without opening it"><kbd>⌘/Ctrl ↵</kbd> Select</span>
        <span className="inline-flex items-center gap-1.5" title="Go up a folder when the cursor is after a trailing slash"><kbd>Backspace</kbd> Back</span>
        <span className="inline-flex items-center gap-1.5"><kbd>Esc</kbd> Close</span>
      </div>
    </dialog>, document.body)}
  </div>;
}
