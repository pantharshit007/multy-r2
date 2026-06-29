import { DEFAULT_MIME_TYPE } from "../constants";

export function guessContentType(key: string): string {
  const extension = key.split(".").pop()?.toLowerCase() ?? "";

  switch (extension) {
    case "avif":
      return "image/avif";
    case "bmp":
      return "image/bmp";
    case "css":
      return "text/css; charset=utf-8";
    case "gif":
      return "image/gif";
    case "htm":
    case "html":
      return "text/html; charset=utf-8";
    case "jpeg":
    case "jpg":
      return "image/jpeg";
    case "js":
    case "mjs":
      return "text/javascript; charset=utf-8";
    case "json":
      return "application/json; charset=utf-8";
    case "png":
      return "image/png";
    case "svg":
      return "image/svg+xml";
    case "txt":
      return "text/plain; charset=utf-8";
    case "webp":
      return "image/webp";
    default:
      return DEFAULT_MIME_TYPE;
  }
}
