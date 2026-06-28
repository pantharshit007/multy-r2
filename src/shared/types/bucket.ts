export type AccessMode = "public" | "private" | "signed-link";

export type BucketConnectionMode = "binding" | "endpoint" | "unconfigured";

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
