import type { EndpointRecord } from "../../shared";

export interface UploadBoxProps {
  record: EndpointRecord;
  disabled: boolean;
  resetToken: number;
  onDone: () => void;
  onError: (message: string | null) => void;
  onStatus: (message: string | null) => void;
}

export interface PageFileDropOptions {
  enabled: boolean;
  onFile: (file: File) => void;
}
