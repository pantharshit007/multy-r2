import type { R2ObjectSummary } from "../../shared";

/** Include implicit parent folders as well as explicit empty directories. */
export function collectFolders(objects: R2ObjectSummary[]): string[] {
  const folders = new Set<string>();
  for (const object of objects) {
    const parts = object.key.replace(/\/+$/, "").split("/");
    const count = object.isFolder ? parts.length : parts.length - 1;
    for (let depth = 1; depth <= count; depth++) {
      const path = parts.slice(0, depth).join("/");
      if (path) folders.add(path);
    }
  }
  return [...folders].sort((a, b) => a.localeCompare(b));
}

export function matchFolders(folders: string[], parent: string, query: string): string[] {
  const prefix = parent ? `${parent}/` : "";
  return folders.filter((folder) => {
    if (!folder.startsWith(prefix)) return false;
    const relative = folder.slice(prefix.length);
    return Boolean(relative) && !relative.includes("/") && relative.toLowerCase().includes(query.trim().toLowerCase());
  });
}

/** Parent-first paths let nested creation reuse existing directories. */
export function missingFolderPaths(path: string, existing: string[]): string[] {
  const known = new Set(existing);
  const parts = path.split("/");
  return parts.map((_, index) => parts.slice(0, index + 1).join("/"))
    .filter((folder) => !known.has(folder));
}

/** A trailing slash scopes results to that directory; the final segment filters its children. */
export function splitFolderPath(value: string) {
  const path = value.trim().replace(/^\/+/, "");
  const separator = path.lastIndexOf("/");
  return {
    parent: separator < 0 ? "" : path.slice(0, separator),
    query: path.slice(separator + 1),
    candidate: path.replace(/\/+$/, ""),
  };
}
