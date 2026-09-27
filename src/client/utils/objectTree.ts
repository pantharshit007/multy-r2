import type { R2ObjectSummary } from "../../shared";
import type { ObjectTreeNode } from "../types/objectTree";

/** Build virtual directories without changing any stored object keys. */
export function buildObjectTree(objects: R2ObjectSummary[]): ObjectTreeNode {
  const root: ObjectTreeNode = { path: "", name: "", folders: [], files: [], placeholders: [] };
  const directories = new Map<string, ObjectTreeNode>([["", root]]);
  for (const object of objects) {
    const parts = object.key.split("/");
    if (object.isFolder && parts.at(-1) === "") parts.pop();
    if (!object.isFolder) parts.pop();
    let parent = root;
    let path = "";
    for (const [index, name] of parts.entries()) {
      path = index === 0 ? name : `${path}/${name}`;
      // Prefix the map key so even an empty path segment is distinct from the root.
      const identity = `folder:${path}`;
      let node = directories.get(identity);
      if (!node) {
        node = { path, name, folders: [], files: [], placeholders: [] };
        directories.set(identity, node);
        parent.folders.push(node);
      }
      parent = node;
    }
    if (object.isFolder) parent.placeholders.push(object);
    else parent.files.push(object);
  }
  for (const node of directories.values()) {
    node.folders.sort((a, b) => a.name.localeCompare(b.name));
    node.files.sort((a, b) => a.key.localeCompare(b.key));
  }
  return root;
}
