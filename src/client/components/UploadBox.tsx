import { FormEvent, useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import type { UploadBoxProps } from "../types/upload";
import { uploadEndpointObject } from "../api";
import { buildPreviewKey, buildDerivedObjectName, buildBaseObjectName } from "../utils/naming";
import { CLOUDFLARE_UPLOAD_LIMITS_URL, MAX_UPLOAD_HISTORY_ENTRIES, UPLOAD_LIMITS } from "../constants";
import { describeUploadResult, formatBytes } from "../utils/format";
import { UploadIcon, CheckIcon, FileIcon } from "./Icons";
import { usePageFileDrop } from "../lib/usePageFileDrop";
import { FileDropOverlay } from "./FileDropOverlay";

import { FolderPicker } from "./FolderPicker";

/** Select a file and destination, then upload to the active endpoint scope. */
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
  const [isPending, startTransition] = useTransition();
  const renameSignatureRef = useRef("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  /** A new selection starts with its own name and retains the chosen folder. */
  function selectFile(next: File | null) {
    if (!next) return;
    setFile(next);
    setKey("");
    setIsEditingName(false);
    setInputNonce((current) => current + 1);
    onError(null);
  }

  const isDragging = usePageFileDrop({ enabled: !disabled && !isPending, onFile: selectFile });

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

  useLayoutEffect(() => {
    setFolder("");
  }, [record.id, record.endPoint, record.workerBucketMode, record.bucketBindingName]);

  const objectName = buildDerivedObjectName(file, key, record.uploadSettings, renameSalt);
  const resolvedName = buildPreviewKey(folder, objectName);

  /** Upload the staged file using the current endpoint and destination. */
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

  const isBusy = disabled || isPending;
  const limitSummary = UPLOAD_LIMITS.filter(({ limit }) => limit !== "Varies").map(({ plan, limit }) => `${limit} on ${plan}`).join(", ");

  return (
    <section className="panel" aria-labelledby="upload-heading">
      {isDragging && <FileDropOverlay />}
      <div className="panel-header">
        <h2 id="upload-heading" className="panel-title">Upload</h2>
        <a href={CLOUDFLARE_UPLOAD_LIMITS_URL} target="_blank" rel="noopener noreferrer" className="text-xs text-muted underline decoration-line-strong underline-offset-4 hover:text-fg">
          Size limits
        </a>
      </div>
      <form className="grid gap-4 p-5" onSubmit={submit}>
        <div
          role="button"
          tabIndex={isBusy ? -1 : 0}
          aria-label={file ? `Selected ${file.name}. Choose a different file` : "Choose a file to upload"}
          onClick={() => {
            if (isBusy) return;
            fileInputRef.current?.click();
          }}
          onKeyDown={(event) => {
            if (isBusy) return;
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              fileInputRef.current?.click();
            }
          }}
          className={`flex items-center gap-4 rounded-xl border border-dashed px-4 py-4 transition-colors ${
            isBusy ? "cursor-not-allowed opacity-60" : "cursor-pointer"
          } ${
            isDragging
              ? "border-accent bg-accent/10"
              : file
                ? "border-solid border-line-strong bg-raised"
                : "border-line-strong bg-inset hover:border-accent/60 hover:bg-raised"
          }`}
        >
          <input
            ref={fileInputRef}
            key={inputNonce}
            className="sr-only"
            type="file"
            disabled={isBusy}
            onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
          />
          <span className={`flex size-10 shrink-0 items-center justify-center rounded-lg border ${file ? "border-accent/30 bg-accent/10 text-accent" : "border-line bg-surface text-muted"}`}>
            {file ? <FileIcon className="size-4.5" /> : <UploadIcon className="size-4.5" />}
          </span>
          {file ? (
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-fg" title={file.name}>{file.name}</span>
              <span className="mt-0.5 block text-xs text-muted">{formatBytes(file.size)}, ready to upload</span>
            </span>
          ) : (
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-fg">
                {isDragging ? "Drop to select this file" : <>Drop a file anywhere, or <span className="text-accent">browse</span></>}
              </span>
              <span className="mt-0.5 block text-xs text-muted">Up to {limitSummary}</span>
            </span>
          )}
          {file ? <span className="hidden text-xs font-medium text-muted sm:inline">Replace</span> : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FolderPicker
            key={`${record.id}:${record.endPoint}:${record.workerBucketMode}:${record.bucketBindingName}`}
            record={record}
            value={folder}
            disabled={isBusy}
            onChange={setFolder}
            onCreated={(path) => {
              onStatus(`Created folder ${path}/`);
              onDone();
            }}
          />

          <div className="grid min-w-0 content-start gap-1.5">
            <label htmlFor="upload-object-key" className="label">Object key</label>
            {isEditingName ? (
              <input
                id="upload-object-key"
                autoFocus
                className="field"
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
                id="upload-object-key"
                className="field flex items-center gap-2 text-left"
                type="button"
                title="Edit file name"
                onClick={() => {
                  setKey(buildBaseObjectName(file, key, record.uploadSettings));
                  setIsEditingName(true);
                }}
              >
                <span className={`min-w-0 flex-1 truncate font-mono text-[13px] ${resolvedName ? "text-fg" : "text-subtle"}`}>{resolvedName || "folder/name.jpg"}</span>
                <span className="shrink-0 text-xs text-subtle">Edit</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="hint">Folders are key prefixes: <code className="code-inline">photos</code> + <code className="code-inline">cat.jpg</code> saves as <code className="code-inline">photos/cat.jpg</code>.</p>
          <button className="btn btn-primary sm:min-w-28" type="submit" disabled={isBusy || !file}>
            <UploadIcon className="size-4" />
            {isPending ? "Uploading…" : "Upload"}
          </button>
        </div>
      </form>

      {history.length > 0 ? (
        <div className="border-t border-line px-5 py-4">
          <h3 className="text-xs font-medium text-subtle">Recent uploads</h3>
          <ul className="mt-2 grid gap-1">
            {history.map((item, index) => (
              <li key={`${index}-${item}`} className="flex items-center gap-2 text-xs text-muted">
                <CheckIcon className="size-3.5 shrink-0" />
                <span className="truncate" title={item}>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
