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
  uploadSettings: UploadSettings;
}

export interface EndpointBucketBinding {
  id: string;
  name: string;
  bindingName: string;
}
