import type { UploadSettings } from "./upload";

export interface EndpointRecord {
  id: string;
  endPoint: string;
  apiKey: string;
  customDomain: string;
  workerBucketMode: boolean;
  bucketId: string;
  bucketName: string;
  bucketBindingName: string;
  /**
   * Per-bucket custom domains in worker-bucket mode, keyed by binding name.
   * Each R2 custom domain maps 1:1 to a bucket, so share URLs for the active
   * binding resolve from here (falling back to the Worker URL when unset).
   */
  bucketDomains: Record<string, string>;
  uploadSettings: UploadSettings;
}

export interface EndpointBucketBinding {
  id: string;
  name: string;
  bindingName: string;
}
