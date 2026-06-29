import type { UploadEndpointObjectResult } from "../api/endpointRecords";

export function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
  return `${(size / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

export function describeUploadResult(result: UploadEndpointObjectResult): string {
  if (result.skipped) return `Skipped existing file ${result.key}`;
  const parts = [`Uploaded ${result.key}`];
  if (result.renamedFrom) parts.push(`renamed from ${result.renamedFrom}`);
  if (result.image?.processed) {
    const extra = [result.image.outputFormat, result.image.removeExif ? "EXIF removed" : null].filter(Boolean).join(", ");
    parts.push(`image processed${extra ? ` (${extra})` : ""}`);
  }
  if (result.uploadedSize !== result.originalSize) parts.push(`${formatBytes(result.originalSize)} -> ${formatBytes(result.uploadedSize)}`);
  return parts.join(" | ");
}
