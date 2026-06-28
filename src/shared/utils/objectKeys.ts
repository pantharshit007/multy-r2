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
