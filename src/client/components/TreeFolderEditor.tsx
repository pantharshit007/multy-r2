import { useRef, useState } from "react";
import type { TreeFolderEditorProps } from "../types/objectTree";
import { createEndpointFolderPath } from "../lib/folders";
import { endpointFolderExists } from "../api";
import { sanitizeFolder } from "../../shared/utils/objectKeys";
import { FolderIcon } from "./Icons";

/** Create a nested folder inline without scanning the bucket. */
export function TreeFolderEditor({ parent, record, onCancel, onCreated }: TreeFolderEditorProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  /** Validate the destination, check its marker, and create missing ancestors. */
  async function create() {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError(null);
    try {
      const child = sanitizeFolder(name);
      if (child.includes("//")) throw new Error("Enter a folder name without empty path segments.");
      const path = parent ? `${parent}/${child}` : child;
      if (await endpointFolderExists(record, path)) throw new Error("This folder already exists.");
      await createEndpointFolderPath(record, path, []);
      onCreated(path);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not create folder");
    } finally {
      busy.current = false;
      setPending(false);
    }
  }
  return <div className="px-4 py-2">
    <form className="flex items-center gap-2" onSubmit={(event) => { event.preventDefault(); void create(); }}>
      <FolderIcon className="size-4 shrink-0" />
      <input autoFocus aria-label={`New folder name in ${parent || "bucket root"}`} value={name} disabled={pending}
        onChange={(event) => setName(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape" && !pending) { event.preventDefault(); onCancel(); } }}
        placeholder="Folder name" className="min-w-0 flex-1 rounded-lg border border-amber-300/60 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:ring-1 focus:ring-amber-300/50" />
      <button type="submit" disabled={pending || !name.trim()} className="rounded-lg px-2 py-2 text-xs text-amber-200 disabled:opacity-40">{pending ? "Creating…" : "Create"}</button>
      <button type="button" disabled={pending} onClick={onCancel} className="rounded-lg px-2 py-2 text-xs text-zinc-500">Cancel</button>
    </form>
    {error && <p role="alert" className="mt-2 text-xs text-red-400">{error}</p>}
  </div>;
}
