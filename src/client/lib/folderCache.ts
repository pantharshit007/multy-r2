import type { EndpointRecord } from "../../shared";
import type { FolderCacheEntry } from "../types/folderCache";
import { FOLDER_CACHE_TTL_MS, MAX_FOLDER_CACHE_ENTRIES } from "../constants";

const entries = new Map<string, FolderCacheEntry>();

/** Credentials and active binding are part of the scope; never persist this key. */
function cacheKey(record: EndpointRecord): string {
  return JSON.stringify([record.endPoint, record.apiKey, record.workerBucketMode, record.bucketBindingName]);
}

/** Reuse only complete, unexpired listings. */
export function readFolderCache(record: EndpointRecord): string[] | null {
  const entry = entries.get(cacheKey(record));
  return entry && entry.expiresAt > Date.now() ? entry.folders : null;
}

/** The entry identity prevents an older scan from restoring invalidated data. */
export function beginFolderCacheLoad(record: EndpointRecord): FolderCacheEntry {
  const key = cacheKey(record);
  const entry: FolderCacheEntry = { folders: null, expiresAt: 0 };
  entries.delete(key);
  if (entries.size >= MAX_FOLDER_CACHE_ENTRIES) entries.delete(entries.keys().next().value!);
  entries.set(key, entry);
  return entry;
}

/** Cache a successful scan only if no mutation or newer scan superseded it. */
export function completeFolderCacheLoad(record: EndpointRecord, entry: FolderCacheEntry, folders: string[]): void {
  if (entries.get(cacheKey(record)) !== entry) return;
  entry.folders = folders;
  entry.expiresAt = Date.now() + FOLDER_CACHE_TTL_MS;
}

/** Writes, deletes, and explicit refreshes invalidate this endpoint scope. */
export function invalidateFolderCache(record: EndpointRecord): void {
  entries.delete(cacheKey(record));
}
