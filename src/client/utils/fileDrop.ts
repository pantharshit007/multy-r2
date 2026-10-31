/** Files are readable on drop; their type is available throughout the drag. */
export function hasDraggedFiles(dataTransfer: DataTransfer | null): boolean {
  return Boolean(dataTransfer?.types.includes("Files") || dataTransfer?.files.length);
}
