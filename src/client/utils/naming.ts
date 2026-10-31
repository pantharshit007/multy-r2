import type { ImageOutputFormat, UploadSettings } from "../../shared";

/** Normalize the upload filename without renaming its destination folders. */
export function normalizeUploadFileName(name: string): string {
  const slash = name.lastIndexOf("/");
  const prefix = name.slice(0, slash + 1);
  const filename = name.slice(slash + 1).trim()
    // Keep a separator after a dot so normalization cannot create "..".
    .replace(/(?<=[^.\s])\s+(?=\.[^.]+$)/u, "")
    .replace(/\s+/gu, "-");
  return `${prefix}${filename}`;
}

export function buildPreviewKey(folder: string, name: string): string {
  const cleanName = name.trim().replace(/^\/+/, "");
  const cleanFolder = folder.trim().replace(/^\/+|\/+$/g, "");
  if (!cleanName) return cleanFolder;
  if (!cleanFolder) return cleanName;
  return `${cleanFolder}/${cleanName}`;
}

export function buildDerivedObjectName(
  file: File | null,
  manualName: string,
  settings: UploadSettings,
  renameSalt: string,
): string {
  const name = buildBaseObjectName(file, manualName, settings);
  if (!name) return "";

  if (settings.duplicateStrategy === "rename") {
    return appendRandomSuffix(name, renameSalt);
  }

  return name;
}

/** The editable name excludes the automatically managed duplicate suffix. */
export function buildBaseObjectName(file: File | null, manualName: string, settings: UploadSettings): string {
  const name = normalizeUploadFileName(manualName.trim() || file?.name || "");
  if (!name) return "";
  return file && file.type.startsWith("image/")
    ? replaceExtension(name, settings.imageUploadSettings.outputFormat)
    : name;
}

export function appendRandomSuffix(name: string, suffix: string): string {
  if (!suffix) return name;
  const dot = name.lastIndexOf(".");
  const base = dot >= 0 ? name.slice(0, dot) : name;
  const ext = dot >= 0 ? name.slice(dot) : "";
  return `${base}-${suffix}${ext}`;
}

export function replaceExtension(name: string, format: ImageOutputFormat): string {
  const dot = name.lastIndexOf(".");
  const base = dot >= 0 ? name.slice(0, dot) : name;
  return `${base}.${format}`;
}
