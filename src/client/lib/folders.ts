import type { EndpointRecord } from "../../shared";
import { createEndpointFolder, listEndpointObjects } from "../api";
import { collectFolders, missingFolderPaths } from "../utils/folders";

export async function loadEndpointFolders(record: EndpointRecord, signal: AbortSignal): Promise<string[]> {
  const folders = new Set<string>();
  const cursors = new Set<string>();
  let cursor: string | null = null;
  do {
    const page = await listEndpointObjects(record, cursor, signal);
    for (const folder of collectFolders(page.objects)) folders.add(folder);
    if (!page.truncated) break;
    cursor = page.cursor;
    if (!cursor || cursors.has(cursor)) throw new Error("Could not load all folders. Please retry.");
    cursors.add(cursor);
  } while (!signal.aborted);
  return [...folders].sort((a, b) => a.localeCompare(b));
}

export async function createEndpointFolderPath(record: EndpointRecord, path: string, existing: string[]): Promise<void> {
  for (const folder of missingFolderPaths(path, existing)) {
    await createEndpointFolder(record, folder);
  }
}
