import { FOLDER_CONTENT_TYPE } from "../constants";

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

export function isDirectoryContentType(contentType: string | null | undefined): boolean {
  if (!contentType) return false;
  return contentType.split(";")[0].trim().toLowerCase() === FOLDER_CONTENT_TYPE;
}

/**
 * Whether a listed object should be treated as a folder placeholder.
 *
 * Prefer explicit `isFolder` from the API. Otherwise: key ends with `/`, or
 * Content-Type is `application/x-directory` (set when creating folders). Do
 * not guess from zero-byte extensionless names — that mislabels files like
 * `README`.
 */
export function isFolderObject(input: {
  key: string;
  isFolder?: boolean | null;
  contentType?: string | null;
}): boolean {
  if (typeof input.isFolder === "boolean") return input.isFolder;
  if (input.key.endsWith("/")) return true;
  return isDirectoryContentType(input.contentType);
}
