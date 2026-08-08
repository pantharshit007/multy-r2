import { DragEvent, FormEvent, useEffect, useRef, useState, useTransition } from "react";
import type { EndpointRecord } from "../../shared";
import { uploadEndpointObject, createEndpointFolder } from "../api";
import { buildPreviewKey, buildDerivedObjectName } from "../utils/naming";
import { MAX_UPLOAD_HISTORY_ENTRIES } from "../constants";
import { describeUploadResult } from "../utils/format";
import { UploadIcon, FolderIcon, CheckIcon, FileIcon } from "./Icons";

interface UploadBoxProps {
  record: EndpointRecord;
  disabled: boolean;
  resetToken: number;
  onDone: () => void;
  onError: (message: string | null) => void;
  onStatus: (message: string | null) => void;
}

export function UploadBox({
  record,
  disabled,
  resetToken,
  onDone,
  onError,
  onStatus,
}: UploadBoxProps) {
  const [key, setKey] = useState("");
  const [folder, setFolder] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [inputNonce, setInputNonce] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const [isEditingName, setIsEditingName] = useState(false);
  const [renameSalt, setRenameSalt] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isPending, startTransition] = useTransition();
  const renameSignatureRef = useRef("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragDepthRef = useRef(0);

  function selectFile(next: File | null) {
    setFile(next);
    if (next) onError(null);
  }

  function handleDragEnter(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (disabled || isPending) return;
    dragDepthRef.current += 1;
    if (event.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) {
      setIsDragging(false);
    }
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (disabled || isPending) return;
    event.dataTransfer.dropEffect = "copy";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    dragDepthRef.current = 0;
    setIsDragging(false);
    if (disabled || isPending) return;
    const dropped = event.dataTransfer.files?.[0] ?? null;
    if (dropped) selectFile(dropped);
  }

  useEffect(() => {
    setHistory([]);
  }, [resetToken]);

  useEffect(() => {
    if (!file) {
      setKey("");
      setFolder("");
      setIsEditingName(false);
      setRenameSalt("");
      renameSignatureRef.current = "";
      return;
    }

    if (record.uploadSettings.duplicateStrategy === "rename") {
      const signature = `${file.name}:${file.size}:${file.lastModified}`;
      if (renameSignatureRef.current !== signature) {
        renameSignatureRef.current = signature;
        setRenameSalt(crypto.randomUUID().split("-")[4]);
      }
    } else {
      setRenameSalt("");
      renameSignatureRef.current = "";
    }
  }, [file, record.uploadSettings.duplicateStrategy]);

  const objectName = buildDerivedObjectName(file, key, record.uploadSettings, renameSalt);
  const resolvedName = buildPreviewKey(folder, objectName);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;
    startTransition(async () => {
      onError(null);
      try {
        const requestKey = buildPreviewKey(folder, buildDerivedObjectName(file, key, record.uploadSettings, renameSalt));
        const result = await uploadEndpointObject(record, file, requestKey);
        setKey("");
        setFolder("");
        setFile(null);
        setInputNonce((current) => current + 1);
        const message = describeUploadResult(result);
        setHistory((current) => [message, ...current].slice(0, MAX_UPLOAD_HISTORY_ENTRIES));
        onStatus(message);
        onDone();
      } catch (cause) {
        onError(cause instanceof Error ? cause.message : "Could not upload file");
      }
    });
  }

  function createFolder() {
    startTransition(async () => {
      onError(null);
      try {
        const result = await createEndpointFolder(record, folder);
        setFolder("");
        onStatus(`Created folder ${result.key}`);
        onDone();
      } catch (cause) {
        onError(cause instanceof Error ? cause.message : "Could not create folder");
      }
    });
  }

  return (
    <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 backdrop-blur-xl">
      <form className="grid gap-4" onSubmit={submit}>
        {/* Upload Area / Dropzone */}
        <div
          role="button"
          tabIndex={disabled || isPending ? -1 : 0}
          onClick={() => {
            if (disabled || isPending) return;
            fileInputRef.current?.click();
          }}
          onKeyDown={(event) => {
            if (disabled || isPending) return;
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center rounded-2xl border border-dashed p-6 text-center transition-all duration-200 ${
            disabled || isPending
              ? "cursor-not-allowed opacity-60"
              : "cursor-pointer"
          } ${
            isDragging
              ? "border-amber-300 bg-amber-300/10 text-zinc-100 ring-2 ring-amber-300/20"
              : file
                ? "border-amber-300/40 bg-amber-300/5 text-zinc-100"
                : "border-zinc-800 bg-zinc-900/10 hover:border-amber-300/40 hover:bg-amber-300/2 text-zinc-400"
          }`}
        >
          <input
            ref={fileInputRef}
            key={inputNonce}
            className="sr-only"
            type="file"
            disabled={disabled || isPending}
            onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
          />
          {file ? (
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-300/10 text-amber-300">
                <CheckIcon className="size-5" />
              </div>
              <div>
                <span className="block text-sm font-semibold truncate max-w-xs">{file.name}</span>
                <span className="mt-0.5 block text-xs text-zinc-500">
                  {(file.size / 1024).toFixed(1)} KB — Ready to upload
                </span>
                <span className="mt-1 block text-[11px] text-zinc-600">
                  Click or drop another file to replace
                </span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${
                isDragging
                  ? "bg-amber-300/15 border-amber-300/40 text-amber-300"
                  : "bg-zinc-900 border-zinc-800 text-zinc-400"
              }`}>
                <UploadIcon className="size-5" />
              </div>
              <div>
                <span className="block text-sm font-medium">
                  {isDragging ? "Drop file to select" : "Choose or drag a file to upload"}
                </span>
                <span className="mt-1 block text-xs text-zinc-500">
                  Any image or document up to worker limit
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Folder & Path Configuration */}
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] items-end">
          <label className="grid gap-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
            <span>Folder / Prefix</span>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center text-zinc-600">
                <FolderIcon className="size-4" />
              </span>
              <input
                className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-900/60 pl-9 pr-3 text-sm text-zinc-50 outline-none focus:border-amber-300/80 focus:bg-zinc-900/80 transition-all"
                value={folder}
                onChange={(event) => setFolder(event.target.value)}
                placeholder="temp (optional)"
              />
            </div>
          </label>

          <button
            className="h-10 rounded-xl border border-zinc-800 px-4 text-xs font-semibold text-zinc-300 hover:border-amber-300/60 hover:bg-zinc-900/60 transition-all"
            type="button"
            disabled={disabled || isPending || !folder}
            onClick={createFolder}
          >
            Create folder placeholder
          </button>
        </div>

        {/* Object Key Name Overrides */}
        <div className="grid gap-1.5">
          <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">
            <span>Destination Object Key</span>
            <span className="text-[10px] text-zinc-600 font-normal">click preview to edit</span>
          </div>
          {isEditingName ? (
            <input
              autoFocus
              className="h-10 w-full rounded-xl border border-zinc-800 bg-zinc-900/60 px-3 text-sm text-zinc-50 outline-none focus:border-amber-300/80 transition-all"
              value={key}
              onChange={(event) => setKey(event.target.value)}
              onBlur={() => setIsEditingName(false)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  setIsEditingName(false);
                }
              }}
            />
          ) : (
            <button
              className="flex h-10 w-full items-center gap-2 rounded-xl border border-zinc-800/80 bg-zinc-900/30 px-3.5 text-left text-sm text-zinc-400 outline-none hover:border-amber-300/40 hover:bg-zinc-900/60 transition-all"
              type="button"
              onClick={() => {
                setKey(objectName);
                setIsEditingName(true);
              }}
            >
              <FileIcon className="size-4 shrink-0" />
              <span className="truncate">{resolvedName || "temp/name.jpg"}</span>
            </button>
          )}
          <p className="text-[11px] leading-relaxed text-zinc-500">
            Preview updates automatically. Folder acts as a virtual prefix (e.g. <code className="bg-zinc-900 px-1 py-0.5 rounded text-zinc-400">temp</code> + <code className="bg-zinc-900 px-1 py-0.5 rounded text-zinc-400">name.jpg</code> = <code className="bg-zinc-900 px-1 py-0.5 rounded text-zinc-400">temp/name.jpg</code>).
          </p>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end">
          <button
            className="h-10 rounded-xl bg-zinc-50 px-5 text-sm font-semibold text-zinc-950 hover:bg-amber-200 active:scale-98 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            type="submit"
            disabled={disabled || isPending || !file}
          >
            {isPending ? "Uploading..." : "Upload Object"}
          </button>
        </div>
      </form>

      {/* Upload History */}
      {history.length > 0 ? (
        <div className="mt-4 border-t border-zinc-850 pt-4">
          <h4 className="text-[10px] font-semibold uppercase tracking-wider text-zinc-600">Recent Uploads</h4>
          <div className="mt-2 grid gap-1.5">
            {history.map((item, index) => (
              <div
                key={`${index}-${item}`}
                className="flex items-center gap-2 truncate rounded-xl border border-zinc-850 bg-zinc-900/20 px-3 py-2 text-[11px] text-zinc-400"
              >
                <CheckIcon className="size-3 text-green-500 shrink-0" />
                <span className="truncate">{item}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
