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
  return <div className="px-3 py-2">
    <form className="flex items-center gap-2" onSubmit={(event) => { event.preventDefault(); void create(); }}>
      <FolderIcon className="size-4 shrink-0 text-accent" />
      <input autoFocus aria-label={`New folder name in ${parent || "bucket root"}`} value={name} disabled={pending}
        onChange={(event) => setName(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape" && !pending) { event.preventDefault(); onCancel(); } }}
        placeholder="Folder name" className="field h-9 min-w-0 flex-1" />
      <button type="submit" disabled={pending || !name.trim()} className="btn btn-primary h-8 px-3 text-xs">{pending ? "Creating…" : "Create"}</button>
      <button type="button" disabled={pending} onClick={onCancel} className="btn btn-ghost h-8 px-3 text-xs">Cancel</button>
    </form>
    {error && <p role="alert" className="mt-2 text-xs text-danger">{error}</p>}
  </div>;
}
