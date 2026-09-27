import { DIRECTORY_VIEW_STORAGE_KEY } from "../constants";
import type { DirectoryView } from "../types/objectTree";

export function readDirectoryView(): DirectoryView {
  try {
    return localStorage.getItem(DIRECTORY_VIEW_STORAGE_KEY) === "tree" ? "tree" : "list";
  } catch {
    return "list";
  }
}

export function saveDirectoryView(view: DirectoryView): void {
  try {
    localStorage.setItem(DIRECTORY_VIEW_STORAGE_KEY, view);
  } catch {
    // Keep the view usable when browser storage is unavailable.
  }
}
