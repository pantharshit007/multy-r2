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
import { DEFAULT_UPLOAD_SETTINGS } from "../../shared";
import { joinUrl } from "../../shared/utils/url";
import { encodeKey, sanitizeKey, sanitizeFolder } from "../../shared/utils/objectKeys";
import { guessContentType } from "../../shared/utils/contentType";
import { API_KEY_HEADER, BINDING_NAME_REGEX, FOLDER_CONTENT_TYPE, PUBLIC_ALIAS_PREFIX, R2_API_PREFIX } from "../../shared/constants";
import { ENDPOINTS_STORAGE_KEY } from "../constants";
import {
  normalizeEndpoint,
  normalizeOptionalText,
} from "../lib/endpointResolver";
import { fitImage, canvasToBlob, isImageFile, toMimeType } from "../lib/imageProcessing";
import { replaceExtension } from "../utils/naming";

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
        customDomain: normalizeDomainInput(record.customDomain),
        workerBucketMode: record.workerBucketMode ?? false,
        bucketId: record.bucketId ?? "",
        bucketName: record.bucketName ?? "",
        bucketBindingName: record.bucketBindingName ?? "",
        bucketDomains: normalizeBucketDomains(record.bucketDomains),
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
  bucketDomains?: Record<string, string>;
  uploadSettings?: Partial<UploadSettings>;
}): EndpointRecord[] {
  const records = listEndpointRecords();
  const existing = input.id ? records.find((record) => record.id === input.id) : undefined;
  const workerBucketMode = input.workerBucketMode ?? existing?.workerBucketMode ?? false;
  const bucketId = workerBucketMode ? normalizeOptionalText(input.bucketId ?? existing?.bucketId ?? "") : "";
  const bucketName = workerBucketMode ? normalizeOptionalText(input.bucketName ?? existing?.bucketName ?? "") : "";
  const bucketBindingName = workerBucketMode ? normalizeBucketBindingName(input.bucketBindingName ?? existing?.bucketBindingName ?? "") : "";
  const bucketDomains = normalizeBucketDomains(input.bucketDomains ?? existing?.bucketDomains ?? {});
  const next: EndpointRecord = {
    id: input.id ?? crypto.randomUUID(),
    endPoint: normalizeEndpoint(input.endPoint),
    apiKey: input.apiKey.trim(),
    customDomain: normalizeDomainInput(input.customDomain),
    workerBucketMode,
    bucketId,
    bucketName,
    bucketBindingName,
    bucketDomains,
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

  const target = new URL(`${R2_API_PREFIX}/bindings`, `${endPoint}/`);
  const response = await fetch(target.toString(), {
    headers: { [API_KEY_HEADER]: apiKey },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Request failed with ${response.status}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error("This endpoint does not expose Multy bucket bindings. Leave multi-bucket mode off unless this Worker supports GET /api/r2/bindings.");
  }

  let body: unknown;
  try {
    body = (await response.json()) as unknown;
  } catch {
    throw new Error("This endpoint returned an invalid bucket list. Leave multi-bucket mode off unless this Worker supports GET /api/r2/bindings.");
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
      "content-type": FOLDER_CONTENT_TYPE,
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
  // A custom domain is bound directly to the R2 bucket and serves objects at
  // the raw key (e.g. `https://r2.example.com/<key>`). This is the production,
  // edge-cached path, so when present use it verbatim with no Worker prefix.
  // In worker-bucket mode the domain is resolved per active binding.
  const customDomain = activeCustomDomain(record);
  if (customDomain) {
    return buildPublicUrl(customDomain, key);
  }

  // Otherwise share through the Worker endpoint (generic `*.workers.dev` or a
  // domain bound to the Worker, which is not edge-cached):
  //  - worker-bucket mode -> public read-only alias `/cdn/<binding>/<key>`
  //  - default bucket      -> public read-only alias `/cdn/<key>`
  const path = record.workerBucketMode && record.bucketBindingName
    ? `${PUBLIC_ALIAS_PREFIX.replace(/^\/+/, "")}/${record.bucketBindingName}/${key}`
    : `${PUBLIC_ALIAS_PREFIX.replace(/^\/+/, "")}/${key}`;
  return buildPublicUrl(record.endPoint, path);
}

/**
 * Joins a base origin and path into an absolute URL. The base is whatever the
 * user typed (a custom domain may omit the scheme), so fall back to the joined
 * string instead of throwing when it cannot be parsed as an absolute URL.
 */
function buildPublicUrl(base: string, path: string): string {
  const joined = joinUrl(base, path);
  try {
    return new URL(joined).toString();
  } catch {
    return joined;
  }
}

/**
 * The custom domain in effect for the record's active bucket. In worker-bucket
 * mode each binding can have its own R2 domain (`bucketDomains`); otherwise the
 * single `customDomain` applies.
 */
function activeCustomDomain(record: EndpointRecord): string {
  if (record.workerBucketMode && record.bucketBindingName) {
    return record.bucketDomains?.[record.bucketBindingName] ?? "";
  }
  return record.customDomain;
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
  const scope = record.workerBucketMode && record.bucketBindingName
    ? `/bucket/${encodeURIComponent(record.bucketBindingName)}`
    : "";
  const target = new URL(`${R2_API_PREFIX}${scope}${path}`, `${record.endPoint}/`);
  return await fetch(target.toString(), {
    ...init,
    headers: {
      [API_KEY_HEADER]: record.apiKey,
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

function normalizeEndpointBucketBinding(value: unknown): EndpointBucketBinding | null {
  if (!value || typeof value !== "object") return null;
  const bucket = value as Partial<EndpointBucketBinding>;
  const bindingName = normalizeOptionalText(bucket.bindingName);
  if (!BINDING_NAME_REGEX.test(bindingName)) return null;

  return {
    id: normalizeOptionalText(bucket.id) || bindingName,
    name: normalizeOptionalText(bucket.name) || bindingName,
    bindingName,
  };
}

function normalizeBucketBindingName(value: string | null | undefined): string {
  const trimmed = normalizeOptionalText(value);
  return BINDING_NAME_REGEX.test(trimmed) ? trimmed : "";
}

function normalizeDomainInput(value: string | null | undefined): string {
  // Store exactly what the user typed (sans surrounding whitespace). We do not
  // inject a scheme; the UI asks for a full `https://` URL. `joinUrl` strips any
  // trailing slash at build time, and `publicUrlFor` tolerates a missing scheme.
  return (value ?? "").trim();
}

function normalizeBucketDomains(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") return {};
  const result: Record<string, string> = {};
  for (const [binding, domain] of Object.entries(value as Record<string, unknown>)) {
    if (!BINDING_NAME_REGEX.test(binding)) continue;
    const normalized = normalizeDomainInput(typeof domain === "string" ? domain : "");
    if (normalized) result[binding] = normalized;
  }
  return result;
}
