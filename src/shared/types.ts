export type AccessMode = "public" | "private" | "signed-link";

export type BucketConnectionMode = "binding" | "endpoint" | "unconfigured";

export type DuplicateStrategy = "keep" | "skip" | "rename";

export type ImageOutputFormat = "webp" | "jpeg" | "png";

export interface ImageUploadSettings {
  compressImagesBeforeUploading: boolean;
  removeExif: boolean;
  outputFormat: ImageOutputFormat;
  maxWidth: number | null;
  maxHeight: number | null;
  imageQuality: number;
}

export interface UploadSettings {
  duplicateStrategy: DuplicateStrategy;
  imageUploadSettings: ImageUploadSettings;
}

export const DEFAULT_UPLOAD_SETTINGS: UploadSettings = {
  duplicateStrategy: "keep",
  imageUploadSettings: {
    compressImagesBeforeUploading: true,
    removeExif: true,
    outputFormat: "webp",
    maxWidth: null,
    maxHeight: null,
    imageQuality: 0.8,
  },
};

export interface Bucket {
  id: string;
  name: string;
  bindingName: string | null;
  endpoint: string | null;
  customDomain: string | null;
  accessMode: AccessMode;
  sortOrder: number;
  publicBaseUrl: string | null;
  connectionMode: BucketConnectionMode;
  createdAt: string;
  updatedAt: string;
}

export interface BucketInput {
  name: string;
  bindingName?: string | null;
  endpoint?: string | null;
  customDomain?: string | null;
  accessMode?: AccessMode;
  sortOrder?: number;
}

export interface BucketPatchInput {
  name?: string;
  bindingName?: string | null;
  endpoint?: string | null;
  customDomain?: string | null;
  accessMode?: AccessMode;
  sortOrder?: number;
}

export interface R2ObjectSummary {
  key: string;
  size: number;
  uploaded: string | null;
  etag: string;
  publicUrl: string | null;
}

export interface EndpointRecord {
  id: string;
  endPoint: string;
  apiKey: string;
  customDomain: string;
  uploadSettings: UploadSettings;
}

export interface ObjectListResponse {
  objects: R2ObjectSummary[];
  truncated: boolean;
  cursor: string | null;
}

export interface PrivateLinkResponse {
  url: string;
  expiresAt: string;
}

export interface ApiErrorBody {
  error: string;
}

export interface MessageResponse {
  ok: true;
}
