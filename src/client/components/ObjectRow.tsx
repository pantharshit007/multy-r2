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

  return (
    <div className="grid gap-2 px-4 py-3 text-sm text-zinc-400 md:grid-cols-[1fr_90px_190px_230px] md:items-center hover:bg-zinc-900/20 transition-all duration-150 group">
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
        <span className="truncate font-medium text-zinc-100 group-hover:text-zinc-50 transition-colors" title={object.key}>
          {object.key}
        </span>
      </div>

      <span className="text-zinc-500 font-mono text-xs md:text-sm">
        {formatBytes(object.size)}
      </span>

      <span className="text-zinc-500 text-xs">
        {object.uploaded ? new Date(object.uploaded).toLocaleString() : "-"}
      </span>

      <span className="flex flex-wrap gap-2">
        {!isFolder && (
          <>
            <button
              className={`flex items-center gap-1.5 cursor-pointer rounded-xl border px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                copied
                  ? "border-green-500/30 bg-green-500/10 text-green-400"
                  : "border-zinc-700 text-zinc-300 hover:border-amber-300 hover:text-amber-200 hover:bg-amber-300/5"
              }`}
              onClick={copyPublicUrl}
              type="button"
            >
              {copied ? (
                <>
                  <CheckIcon className="size-3.5" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <CopyIcon className="size-3.5" />
                  <span>Copy URL</span>
                </>
              )}
            </button>

            <a
              className="flex items-center gap-1.5 rounded-xl border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:border-amber-300 hover:text-amber-200 hover:bg-amber-300/5 transition-all duration-200"
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Open in new tab"
              aria-label="Open in new tab"
            >
              <span>Open</span>
              <ExternalLinkIcon className="size-3.5 text-zinc-500 group-hover:text-amber-300 transition-colors" />
            </a>
          </>
        )}

        <button
          className="flex items-center gap-1.5 rounded-xl border border-red-900/60 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-950/40 hover:border-red-800 transition-all duration-200"
          onClick={onDelete}
          type="button"
        >
          <TrashIcon className="size-3.5" />
          <span>Delete</span>
        </button>
      </span>
    </div>
  );
}
