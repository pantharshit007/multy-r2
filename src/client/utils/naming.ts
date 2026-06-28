import type { ImageOutputFormat, UploadSettings } from "../../shared";

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
  const name = manualName.trim() || file?.name || "";
  if (!name) return "";

  const imageName = file && file.type.startsWith("image/")
    ? replaceExtension(name, settings.imageUploadSettings.outputFormat)
    : name;

  if (settings.duplicateStrategy === "rename") {
    return appendRandomSuffix(imageName, renameSalt);
  }

  return imageName;
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
