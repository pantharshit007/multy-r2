import { useEffect, useRef, useState } from "react";
import type { EndpointRecord, R2ObjectSummary } from "../../shared";
import { isFolderObject } from "../../shared/utils/objectKeys";
import { publicUrlFor } from "../api";
import { formatBytes, formatDate } from "../utils/format";
import { CopyIcon, CheckIcon, ExternalLinkIcon, TrashIcon, ImageIcon, CodeIcon, FileIcon, FolderIcon } from "./Icons";

interface ObjectRowProps {
  compact?: boolean;
  record: EndpointRecord;
  object: R2ObjectSummary;
  onDelete: () => void;
  onError: (message: string | null) => void;
  onStatus: (message: string | null) => void;
}

/** Display an object with copy, open, and delete actions. */
export function ObjectRow({
  record,
  compact = false,
  object,
  onDelete,
  onError,
  onStatus,
}: ObjectRowProps) {
  const publicUrl = publicUrlFor(record, object.key);
  const [copied, setCopied] = useState(false);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    };
  }, []);

  /** Copy the resolved public URL and show temporary feedback. */
  async function copyPublicUrl() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      onStatus("Public URL copied");
      setCopied(true);
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
      copiedTimerRef.current = setTimeout(() => {
        setCopied(false);
        copiedTimerRef.current = null;
      }, 2000);
    } catch {
      onError(publicUrl);
    }
  }

  // Prefer API `isFolder` / directory content-type / trailing-slash keys.
  const isFolder = isFolderObject(object);
  const extension = object.key.split(".").pop()?.toLowerCase() || "";
  const isImage = !isFolder && ["jpg", "jpeg", "png", "gif", "webp", "svg", "ico"].includes(extension);
  const isCode = !isFolder && ["json", "txt", "js", "ts", "html", "css", "md", "sh", "yml", "yaml"].includes(extension);

  const name = compact ? object.key.split("/").filter(Boolean).pop() || object.key : object.key;

  return (
    <div className={`group grid items-center gap-x-3 gap-y-1 py-2 text-sm transition-colors hover:bg-raised/60 ${compact ? "grid-cols-[minmax(0,1fr)_auto] rounded-lg px-3" : "px-5 grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1fr)_5.5rem_10.5rem_6.5rem]"}`}>
      <div className="flex min-w-0 items-center gap-3">
        <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${isFolder ? "bg-accent/10 text-accent" : "bg-raised text-muted"}`}>
          {isFolder ? (
            <FolderIcon className="size-4" />
          ) : isImage ? (
            <ImageIcon className="size-4" />
          ) : isCode ? (
            <CodeIcon className="size-4" />
          ) : (
            <FileIcon className="size-4" />
          )}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-fg" title={object.key}>{name}</span>
          {!compact ? (
            <span className="block text-xs text-subtle tabular-nums md:hidden">
              {isFolder ? "Folder" : formatBytes(object.size)}{object.uploaded ? `, ${formatDate(object.uploaded)}` : ""}
            </span>
          ) : null}
        </span>
      </div>

      {!compact && <>
        <span className="hidden text-right text-[13px] text-muted tabular-nums md:block">
          {isFolder ? "—" : formatBytes(object.size)}
        </span>
        <span className="hidden text-[13px] whitespace-nowrap text-muted md:block">
          {formatDate(object.uploaded)}
        </span>
      </>}

      <span className="flex flex-nowrap items-center justify-end gap-0.5">
        {!isFolder && (
          <>
            <button
              className={`icon-btn ${copied ? "text-success" : ""}`}
              onClick={copyPublicUrl}
              type="button"
              title={copied ? "Copied" : "Copy public URL"}
              aria-label={copied ? "Copied" : "Copy public URL"}
            >
              {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
            </button>

            <a
              className="icon-btn"
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Open in new tab"
              aria-label="Open in new tab"
            >
              <ExternalLinkIcon className="size-4" />
            </a>
          </>
        )}

        <button
          className="icon-btn icon-btn-danger"
          onClick={onDelete}
          type="button"
          title={isFolder ? "Delete folder entry" : "Delete"}
          aria-label={isFolder ? "Delete folder entry" : "Delete"}
        >
          <TrashIcon className="size-4" />
        </button>
      </span>
    </div>
  );
}
