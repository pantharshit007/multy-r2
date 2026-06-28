import type {
  DuplicateStrategy,
  EndpointBucketBinding,
  EndpointRecord,
  ImageOutputFormat,
  ImageUploadSettings,
  ObjectListResponse,
  PrivateLinkResponse,
  R2ObjectSummary,
  UploadSettings,
} from "../../shared";
import { DEFAULT_UPLOAD_SETTINGS, joinUrl } from "../../shared";

const ENDPOINTS_STORAGE_KEY = "multy-r2:endpoints";
const INTERNAL_ENDPOINT_PROXY_PREFIX = "/_multy/endpoint";

export function listEndpointRecords(): EndpointRecord[] {
  const raw = localStorage.getItem(ENDPOINTS_STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as Array<Partial<EndpointRecord> & { endpoint?: string }>;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((record) => ({
        id: record.id ?? crypto.randomUUID(),
        endPoint: normalizeEndpoint(record.endPoint ?? record.endpoint ?? ""),
        apiKey: record.apiKey ?? "",
        customDomain: normalizeOptionalEndpoint(record.customDomain ?? ""),
        workerBucketMode: record.workerBucketMode ?? false,
        bucketId: record.bucketId ?? "",
        bucketName: record.bucketName ?? "",
        bucketBindingName: record.bucketBindingName ?? "",
        uploadSettings: normalizeUploadSettings(record.uploadSettings),
      }))
      .filter((record) => record.endPoint && record.apiKey);
  } catch {
    return [];
  }
}

export function saveEndpointRecord(input: {
  id?: string;
  endPoint: string;
  apiKey: string;
  customDomain?: string;
  workerBucketMode?: boolean;
  bucketId?: string;
  bucketName?: string;
  bucketBindingName?: string;
  uploadSettings?: Partial<UploadSettings>;
}): EndpointRecord[] {
  const records = listEndpointRecords();
  const existing = input.id ? records.find((record) => record.id === input.id) : undefined;
  const workerBucketMode = input.workerBucketMode ?? existing?.workerBucketMode ?? false;
  const bucketId = workerBucketMode ? normalizeOptionalText(input.bucketId ?? existing?.bucketId ?? "") : "";
  const bucketName = workerBucketMode ? normalizeOptionalText(input.bucketName ?? existing?.bucketName ?? "") : "";
  const bucketBindingName = workerBucketMode ? normalizeBucketBindingName(input.bucketBindingName ?? existing?.bucketBindingName ?? "") : "";
  const next: EndpointRecord = {
    id: input.id ?? crypto.randomUUID(),
    endPoint: normalizeEndpoint(input.endPoint),
    apiKey: input.apiKey.trim(),
    customDomain: normalizeOptionalEndpoint(input.customDomain),
    workerBucketMode,
    bucketId,
    bucketName,
    bucketBindingName,
    uploadSettings: input.uploadSettings ? normalizeUploadSettings(input.uploadSettings) : existing?.uploadSettings ?? cloneUploadSettings(DEFAULT_UPLOAD_SETTINGS),
  };

  if (!next.endPoint || !next.apiKey) {
    throw new Error("Endpoint and API key are required");
  }

  const index = records.findIndex((record) => record.id === next.id);
  const updated = index >= 0 ? records.map((record, recordIndex) => (recordIndex === index ? next : record)) : [...records, next];
  localStorage.setItem(ENDPOINTS_STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export function deleteEndpointRecord(id: string): EndpointRecord[] {
  const updated = listEndpointRecords().filter((record) => record.id !== id);
  localStorage.setItem(ENDPOINTS_STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export async function listEndpointObjects(record: EndpointRecord, cursor?: string | null): Promise<ObjectListResponse> {
  const params = new URLSearchParams();
  if (cursor) params.set("cursor", cursor);
  const response = await endpointRequest(record, params.size ? `/?${params}` : "/", { method: "PATCH" });
  const body = (await response.json()) as {
    objects?: Array<{ key: string; size: number; uploaded?: string | Date; etag?: string }>;
    truncated?: boolean;
    cursor?: string;
  };

  return {
    objects: (body.objects ?? []).map((object) => toObjectSummary(record, object)),
    truncated: Boolean(body.truncated),
    cursor: body.cursor ?? null,
  };
}

export async function listEndpointBucketBindings(input: { endPoint: string; apiKey: string }): Promise<EndpointBucketBinding[]> {
  const endPoint = normalizeEndpoint(input.endPoint);
  const apiKey = input.apiKey.trim();

  if (!endPoint || !apiKey) {
    throw new Error("Endpoint and API key are required before loading buckets");
  }

  const target = new URL("/endpoint/buckets", `${endPoint}/`);
  const response = await fetch(resolveEndpointUrl(target).toString(), {
    headers: { "x-api-key": apiKey },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Request failed with ${response.status}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error("This endpoint does not expose Multy bucket bindings. Leave multi-bucket mode off unless this Worker supports GET /endpoint/buckets.");
  }

  let body: unknown;
  try {
    body = (await response.json()) as unknown;
  } catch {
    throw new Error("This endpoint returned an invalid bucket list. Leave multi-bucket mode off unless this Worker supports GET /endpoint/buckets.");
  }

  return Array.isArray(body) ? body.map(normalizeEndpointBucketBinding).filter((bucket) => bucket !== null) : [];
}

export interface UploadEndpointObjectResult {
  key: string;
  publicUrl: string | null;
  skipped: boolean;
  renamedFrom: string | null;
  originalSize: number;
  uploadedSize: number;
  image: {
    processed: boolean;
    removeExif: boolean;
    outputFormat: ImageOutputFormat;
  } | null;
}

export async function uploadEndpointObject(record: EndpointRecord, file: File, key: string): Promise<UploadEndpointObjectResult> {
  const cleanKey = sanitizeKey(key || file.name);
  const uploadFile = await prepareUploadFile(file, record.uploadSettings.imageUploadSettings);
  const uploadKey = cleanKey;

  if (record.uploadSettings.duplicateStrategy === "skip" && (await objectExists(record, uploadKey))) {
    return {
      key: uploadKey,
      publicUrl: publicUrlFor(record, uploadKey),
      skipped: true,
      renamedFrom: null,
      originalSize: file.size,
      uploadedSize: 0,
      image: null,
    };
  }

  await endpointRequest(record, `/${encodeKey(uploadKey)}`, {
    method: "PUT",
    headers: { "content-type": uploadFile.type || guessContentType(uploadKey) },
    body: uploadFile,
  });

  return {
    key: uploadKey,
    publicUrl: publicUrlFor(record, uploadKey),
    skipped: false,
    renamedFrom: uploadKey === cleanKey ? null : cleanKey,
    originalSize: file.size,
    uploadedSize: uploadFile.size,
    image: isImageFile(file)
      ? {
          processed: uploadFile.size !== file.size || uploadFile.type !== file.type,
          removeExif: record.uploadSettings.imageUploadSettings.removeExif,
          outputFormat: record.uploadSettings.imageUploadSettings.outputFormat,
        }
      : null,
  };
}

export async function createEndpointFolder(record: EndpointRecord, folder: string): Promise<{ key: string; publicUrl: string | null }> {
  const cleanFolder = sanitizeFolder(folder);
  const key = `${cleanFolder}/`;
  await endpointRequest(record, `/${encodeKey(key)}`, {
    method: "PUT",
    headers: {
      "content-type": "application/x-directory",
    },
    body: new Blob([]),
  });

  return { key, publicUrl: publicUrlFor(record, key) };
}

export async function deleteEndpointObject(record: EndpointRecord, key: string): Promise<void> {
  await endpointRequest(record, `/${encodeKey(key)}`, {
    method: "DELETE",
  });
}

export function publicUrlFor(record: EndpointRecord, key: string): string {
  const url = new URL(joinUrl(record.customDomain || record.endPoint, key));
  if (record.workerBucketMode && record.bucketBindingName) {
    url.searchParams.set("bucketBindingName", record.bucketBindingName);
  }
  return resolveEndpointUrl(url).toString();
}

export function createPrivateLink(): Promise<PrivateLinkResponse> {
  return Promise.reject(new Error("Private signed links are only available through the D1 control-plane Worker."));
}

export function defaultUploadSettings(): UploadSettings {
  return cloneUploadSettings(DEFAULT_UPLOAD_SETTINGS);
}

async function endpointRequest(record: EndpointRecord, path: string, init?: RequestInit): Promise<Response> {
  const response = await endpointFetch(record, path, init);

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Request failed with ${response.status}`);
  }

  return response;
}

async function endpointFetch(record: EndpointRecord, path: string, init?: RequestInit): Promise<Response> {
  const target = new URL(path, `${record.endPoint}/`);
  if (record.workerBucketMode && record.bucketBindingName) {
    target.searchParams.set("bucketBindingName", record.bucketBindingName);
  }
  return await fetch(resolveEndpointUrl(target).toString(), {
    ...init,
    headers: {
      "x-api-key": record.apiKey,
      ...init?.headers,
    },
  });
}

async function objectExists(record: EndpointRecord, key: string): Promise<boolean> {
  const response = await endpointFetch(record, `/${encodeKey(key)}`, { method: "HEAD" });
  return response.ok;
}

async function prepareUploadFile(file: File, settings: ImageUploadSettings): Promise<File | Blob> {
  if (!isImageFile(file)) {
    return file;
  }

  if (!settings.compressImagesBeforeUploading && !settings.removeExif) {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  try {
    const dimensions = settings.compressImagesBeforeUploading
      ? fitImage(bitmap.width, bitmap.height, settings.maxWidth, settings.maxHeight)
      : { width: bitmap.width, height: bitmap.height };
    const canvas = document.createElement("canvas");
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    const context = canvas.getContext("2d");
    if (!context) return file;

    context.drawImage(bitmap, 0, 0, dimensions.width, dimensions.height);

    const mimeType = toMimeType(settings.outputFormat);
    const blob = await canvasToBlob(canvas, mimeType, settings.imageQuality);
    if (!blob) return file;

    return new File([blob], replaceExtension(file.name, settings.outputFormat), { type: mimeType });
  } finally {
    bitmap.close();
  }
}

function fitImage(width: number, height: number, maxWidth: number | null, maxHeight: number | null): { width: number; height: number } {
  const widthRatio = maxWidth ? maxWidth / width : 1;
  const heightRatio = maxHeight ? maxHeight / height : 1;
  const ratio = Math.min(1, widthRatio, heightRatio);
  return { width: Math.max(1, Math.round(width * ratio)), height: Math.max(1, Math.round(height * ratio)) };
}

function toMimeType(format: ImageOutputFormat): string {
  switch (format) {
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
  }
}

function replaceExtension(name: string, format: ImageOutputFormat): string {
  const parts = name.split("/");
  const last = parts.pop() ?? name;
  const base = last.includes(".") ? last.slice(0, last.lastIndexOf(".")) : last;
  parts.push(`${base}.${format}`);
  return parts.join("/");
}

function isImageFile(file: File): boolean {
  return file.type.startsWith("image/");
}

async function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return await new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), type, quality));
}

function normalizeUploadSettings(value: unknown): UploadSettings {
  const settings = value as Partial<UploadSettings> | undefined;
  const image = (settings?.imageUploadSettings ?? {}) as Partial<ImageUploadSettings>;

  return {
    duplicateStrategy: normalizeDuplicateStrategy(settings?.duplicateStrategy),
    imageUploadSettings: {
      compressImagesBeforeUploading: image.compressImagesBeforeUploading ?? DEFAULT_UPLOAD_SETTINGS.imageUploadSettings.compressImagesBeforeUploading,
      removeExif: image.removeExif ?? DEFAULT_UPLOAD_SETTINGS.imageUploadSettings.removeExif,
      outputFormat: normalizeImageOutputFormat(image.outputFormat),
      maxWidth: normalizeNullableNumber(image.maxWidth),
      maxHeight: normalizeNullableNumber(image.maxHeight),
      imageQuality: clampQuality(image.imageQuality),
    },
  };
}

function cloneUploadSettings(settings: UploadSettings): UploadSettings {
  return {
    duplicateStrategy: settings.duplicateStrategy,
    imageUploadSettings: { ...settings.imageUploadSettings },
  };
}

function normalizeDuplicateStrategy(value: unknown): DuplicateStrategy {
  return value === "skip" || value === "rename" ? value : "keep";
}

function normalizeImageOutputFormat(value: unknown): ImageOutputFormat {
  return value === "jpeg" || value === "png" ? value : "webp";
}

function normalizeNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function clampQuality(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_UPLOAD_SETTINGS.imageUploadSettings.imageQuality;
  return Math.min(1, Math.max(0, parsed));
}

function resolveEndpointUrl(target: URL): URL {
  if (isSameOriginEndpoint(target)) {
    return new URL(`${INTERNAL_ENDPOINT_PROXY_PREFIX}${target.pathname}${target.search}`, target.origin);
  }

  return target;
}

function isSameOriginEndpoint(url: URL): boolean {
  const currentOrigin = globalThis.location?.origin;
  return Boolean(currentOrigin && url.origin === currentOrigin);
}

function toObjectSummary(
  record: EndpointRecord,
  object: { key: string; size: number; uploaded?: string | Date; etag?: string },
): R2ObjectSummary {
  return {
    key: object.key,
    size: object.size,
    uploaded: object.uploaded ? new Date(object.uploaded).toISOString() : null,
    etag: object.etag ?? "",
    publicUrl: publicUrlFor(record, object.key),
  };
}

function normalizeEndpoint(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function normalizeEndpointBucketBinding(value: unknown): EndpointBucketBinding | null {
  if (!value || typeof value !== "object") return null;
  const bucket = value as Partial<EndpointBucketBinding>;
  const bindingName = normalizeOptionalText(bucket.bindingName);
  if (!/^[A-Z][A-Z0-9_]*$/.test(bindingName)) return null;

  return {
    id: normalizeOptionalText(bucket.id) || bindingName,
    name: normalizeOptionalText(bucket.name) || bindingName,
    bindingName,
  };
}

function normalizeBucketBindingName(value: string | null | undefined): string {
  const trimmed = normalizeOptionalText(value);
  return /^[A-Z][A-Z0-9_]*$/.test(trimmed) ? trimmed : "";
}

function normalizeOptionalEndpoint(value: string | null | undefined): string {
  const trimmed = (value ?? "").trim();
  return trimmed ? normalizeEndpoint(trimmed) : "";
}

function normalizeOptionalText(value: string | null | undefined): string {
  return (value ?? "").trim();
}

function sanitizeKey(value: string): string {
  const key = value.trim().replace(/^\/+/, "");
  if (!key || key.includes("..")) throw new Error("Object key is invalid");
  return key;
}

function sanitizeFolder(value: string): string {
  const folder = value.trim().replace(/^\/+|\/+$/g, "");
  if (!folder || folder.includes("..")) throw new Error("Folder name is invalid");
  return folder;
}

function encodeKey(key: string): string {
  return key.split("/").map(encodeURIComponent).join("/");
}

function guessContentType(key: string): string {
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
      return "application/octet-stream";
  }
}
