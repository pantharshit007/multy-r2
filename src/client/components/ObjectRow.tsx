import { useEffect, useRef, useState } from "react";
import type { EndpointRecord, R2ObjectSummary } from "../../shared";
import { publicUrlFor } from "../api";
import { formatBytes } from "../utils/format";
import { CopyIcon, CheckIcon, ExternalLinkIcon, TrashIcon, ImageIcon, CodeIcon, FileIcon, FolderIcon } from "./Icons";

interface ObjectRowProps {
  record: EndpointRecord;
  object: R2ObjectSummary;
  onDelete: () => void;
  onError: (message: string | null) => void;
  onStatus: (message: string | null) => void;
}

export function ObjectRow({
  record,
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

  // Folder placeholders are written as keys ending with "/".
  const isFolder = object.key.endsWith("/");
  const extension = object.key.split(".").pop()?.toLowerCase() || "";
  const isImage = !isFolder && ["jpg", "jpeg", "png", "gif", "webp", "svg", "ico"].includes(extension);
  const isCode = !isFolder && ["json", "txt", "js", "ts", "html", "css", "md", "sh", "yml", "yaml"].includes(extension);

  const iconBtnBase =
    "inline-flex size-8 shrink-0 items-center justify-center rounded-lg border transition-all duration-200 cursor-pointer";

  return (
    <div className="grid gap-2 px-4 py-3 text-sm text-zinc-400 md:grid-cols-[minmax(0,1fr)_4.5rem_9.5rem_6.75rem] md:items-center hover:bg-zinc-900/20 transition-all duration-150 group">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 group-hover:border-zinc-700 group-hover:text-zinc-200 transition-colors">
          {isFolder ? (
            <FolderIcon className="size-4.5" />
          ) : isImage ? (
            <ImageIcon className="size-4.5" />
          ) : isCode ? (
            <CodeIcon className="size-4.5" />
          ) : (
            <FileIcon className="size-4.5" />
          )}
        </div>
        <span className="min-w-0 truncate font-medium text-zinc-100 group-hover:text-zinc-50 transition-colors" title={object.key}>
          {object.key}
        </span>
      </div>

      <span className="text-zinc-500 font-mono text-xs tabular-nums md:text-sm">
        {formatBytes(object.size)}
      </span>

      <span className="text-zinc-500 text-xs whitespace-nowrap">
        {object.uploaded ? new Date(object.uploaded).toLocaleString() : "-"}
      </span>

      <span className="flex items-center justify-end gap-1.5 flex-nowrap">
        {!isFolder && (
          <>
            <button
              className={`${iconBtnBase} ${
                copied
                  ? "border-green-500/30 bg-green-500/10 text-green-400"
                  : "border-zinc-700 text-zinc-300 hover:border-amber-300 hover:text-amber-200 hover:bg-amber-300/5"
              }`}
              onClick={copyPublicUrl}
              type="button"
              title={copied ? "Copied" : "Copy URL"}
              aria-label={copied ? "Copied" : "Copy URL"}
            >
              {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
            </button>

            <a
              className={`${iconBtnBase} border-zinc-700 text-zinc-300 hover:border-amber-300 hover:text-amber-200 hover:bg-amber-300/5`}
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Open in new tab"
              aria-label="Open in new tab"
            >
              <ExternalLinkIcon className="size-3.5" />
            </a>
          </>
        )}

        <button
          className={`${iconBtnBase} border-red-900/60 text-red-400 hover:bg-red-950/40 hover:border-red-800`}
          onClick={onDelete}
          type="button"
          title="Delete"
          aria-label="Delete"
        >
          <TrashIcon className="size-3.5" />
        </button>
      </span>
    </div>
  );
}
