import type { EndpointRecord } from "../../shared";

export interface FolderPickerProps {
  record: EndpointRecord;
  value: string;
  disabled: boolean;
  onChange: (folder: string) => void;
  onCreated: (folder: string) => void;
}
