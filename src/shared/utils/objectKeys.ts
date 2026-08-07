export function encodeKey(key: string): string {
  return key.split("/").map(encodeURIComponent).join("/");
}

export function sanitizeKey(value: string): string {
  const key = value.trim().replace(/^\/+/, "");
  if (!key || key.includes("..")) throw new Error("Object key is invalid");
  return key;
}

export function sanitizeFolder(value: string): string {
  const folder = value.trim().replace(/^\/+|\/+$/g, "");
  if (!folder || folder.includes("..")) throw new Error("Folder name is invalid");
  return folder;
}

/**
 * Whether a listed object should be treated as a folder placeholder.
 *
 * Canonical keys end with `/` (e.g. `temp/`). Hono's non-strict routing can
 * strip that trailing slash on PUT, so we also treat zero-byte keys whose
 * last segment has no file extension as folders (legacy / stripped keys).
 */
export function isFolderObject(key: string, size = 0): boolean {
  if (key.endsWith("/")) return true;
  if (size !== 0) return false;
  const base = key.split("/").filter(Boolean).pop() ?? "";
  if (!base) return false;
  // "temp", "new/" basename → folder; "hi.txt", "pfp.webp" → file
  return !base.includes(".");
}
