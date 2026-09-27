import type { EndpointRecord, R2ObjectSummary } from "../../shared";

export type DirectoryView = "list" | "tree";

export interface ObjectTreeNode {
  path: string;
  name: string;
  folders: ObjectTreeNode[];
  files: R2ObjectSummary[];
  placeholders: R2ObjectSummary[];
}

export interface ObjectTreeProps {
  record: EndpointRecord;
  objects: R2ObjectSummary[];
  hasMore: boolean;
  onCreated: (path: string) => void;
  onDelete: (object: R2ObjectSummary) => void;
  onError: (message: string | null) => void;
  onStatus: (message: string | null) => void;
}

export interface TreeContentsProps extends ObjectTreeProps {
  node: ObjectTreeNode;
  selected: string;
  expanded: Set<string>;
  editing: string | null;
  onSelect: (path: string) => void;
  onToggle: (path: string) => void;
  onCancel: () => void;
}

export interface TreeFolderEditorProps {
  parent: string;
  record: EndpointRecord;
  onCancel: () => void;
  onCreated: (path: string) => void;
}
