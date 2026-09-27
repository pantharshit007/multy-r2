import type { EndpointRecord } from "../../shared";
import { createEndpointFolder, endpointFolderExists, listEndpointObjects } from "../api";
import { beginFolderCacheLoad, completeFolderCacheLoad, readFolderCache } from "./folderCache";
import { collectFolders, missingFolderPaths } from "../utils/folders";

/** Discover folders progressively, reusing a short-lived cache between openings. */
export async function loadEndpointFolders(record: EndpointRecord, signal: AbortSignal, onProgress?: (folders: string[]) => void): Promise<string[]> {
  signal.throwIfAborted();
  const cached = readFolderCache(record);
  if (cached) return cached;
  const entry = beginFolderCacheLoad(record);
  const folders = new Set<string>();
  const cursors = new Set<string>();
  let cursor: string | null = null;
  do {
    const page = await listEndpointObjects(record, cursor, signal);
    signal.throwIfAborted();
    for (const folder of collectFolders(page.objects)) folders.add(folder);
    onProgress?.([...folders].sort((a, b) => a.localeCompare(b)));
    if (!page.truncated) break;
    cursor = page.cursor;
    if (!cursor || cursors.has(cursor)) throw new Error("Could not load all folders. Please retry.");
    cursors.add(cursor);
  } while (!signal.aborted);
  signal.throwIfAborted();
  const result = [...folders].sort((a, b) => a.localeCompare(b));
  completeFolderCacheLoad(record, entry, result);
  return result;
}

/** Create only the requested ancestors; discovery is never required. */
export async function createEndpointFolderPath(record: EndpointRecord, path: string, existing: string[]): Promise<void> {
  for (const folder of missingFolderPaths(path, existing)) {
    if (!(await endpointFolderExists(record, folder))) await createEndpointFolder(record, folder);
  }
}
