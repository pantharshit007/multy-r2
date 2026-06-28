import type { ImageOutputFormat } from "../../shared";

export function fitImage(width: number, height: number, maxWidth: number | null, maxHeight: number | null): { width: number; height: number } {
  const widthRatio = maxWidth ? maxWidth / width : 1;
  const heightRatio = maxHeight ? maxHeight / height : 1;
  const ratio = Math.min(1, widthRatio, heightRatio);
  return { width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)) };
}

export function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), type, quality));
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

export function toMimeType(format: ImageOutputFormat): string {
  switch (format) {
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
  }
}
