import { Link, useParams } from "@tanstack/react-router";
import { FormEvent, useEffect, useRef, useState, useTransition } from "react";
import {
  createEndpointFolder,
  deleteEndpointObject,
  listEndpointObjects,
  listEndpointRecords,
  publicUrlFor,
  saveEndpointRecord,
  uploadEndpointObject,
} from "../api";
import type { DuplicateStrategy, EndpointRecord, ImageOutputFormat, R2ObjectSummary } from "../../shared";
import { WorkerBucketPicker } from "../components/WorkerBucketPicker";
import { formatBytes, describeUploadResult } from "../utils/format";
import { buildPreviewKey, buildDerivedObjectName } from "../utils/naming";
import { MAX_UPLOAD_HISTORY_ENTRIES, SETTINGS_SAVED_FEEDBACK_MS } from "../constants";

export function EndpointPage() {
  const { bucketId } = useParams({ from: "/buckets/$bucketId" });
  const [record, setRecord] = useState<EndpointRecord | null>(() => findRecord(bucketId));
  const [objects, setObjects] = useState<R2ObjectSummary[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [uploadLogReset, setUploadLogReset] = useState(0);

  useEffect(() => {
    const next = findRecord(bucketId);
    setRecord(next);
    if (next) void refreshObjects(next);
    else setIsLoading(false);
  }, [bucketId]);

  async function refreshObjects(target = record) {
    if (!target) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await listEndpointObjects(target);
      setObjects(response.objects);
      setCursor(response.cursor);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load objects");
    } finally {
      setIsLoading(false);
    }
  }

  function runAction(action: () => Promise<void>) {
    startTransition(async () => {
      setError(null);
      setStatus(null);
      try {
        await action();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Action failed");
      }
    });
  }

  async function loadMore() {
    if (!record || !cursor) return;
    const response = await listEndpointObjects(record, cursor);
    setObjects((current) => [...current, ...response.objects]);
    setCursor(response.cursor);
  }

  if (!record) {
    return (
      <main className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5">
        <p className="text-sm text-zinc-400">Endpoint not found.</p>
        <Link to="/" className="mt-4 inline-flex rounded-xl border border-zinc-700 px-3 py-2 text-sm text-zinc-200">
          Back to endpoints
        </Link>
      </main>
    );
  }

  return (
    <main className="grid gap-4 lg:grid-cols-[1fr_420px]">
      <section className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5 shadow-2xl lg:col-span-2">
        <Link to="/" className="text-sm text-amber-300 hover:text-amber-200">Back to endpoints</Link>
        <div className="mt-4 flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Endpoint</p>
            <h1 className="mt-1 break-all text-3xl font-semibold tracking-tight text-zinc-50">{displayDomain(record)}</h1>
            <p className="mt-2 break-all text-sm text-zinc-500">{record.endPoint}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {record.workerBucketMode ? (
              <span className="w-fit rounded-full border border-green-400/30 bg-green-400/10 px-3 py-1 text-xs text-green-200">bucket {record.bucketBindingName || record.bucketName || "selected"}</span>
            ) : null}
            <span className="w-fit rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-xs text-amber-200">x-api-key configured</span>
          </div>
        </div>
      </section>

      <section className="min-w-0 rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5 shadow-2xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">R2 objects</p>
            <h2 className="mt-1 text-2xl font-semibold text-zinc-50">Files</h2>
          </div>
          <button
            className="rounded-xl border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:border-amber-300"
            onClick={() => {
              setStatus(null);
              setUploadLogReset((current) => current + 1);
              runAction(() => refreshObjects());
            }}
            type="button"
            disabled={isPending}
          >
            Refresh
          </button>
        </div>

        {error ? <div className="mt-4 rounded-2xl border border-red-900/60 bg-red-950/40 p-3 text-sm text-red-200">{error}</div> : null}
        {status ? <div className="mt-4 rounded-2xl border border-green-900/60 bg-green-950/40 p-3 text-sm text-green-200">{status}</div> : null}

        <UploadBox
          record={record}
          disabled={isPending}
          resetToken={uploadLogReset}
          onDone={() => runAction(() => refreshObjects())}
          onError={setError}
          onStatus={setStatus}
        />

        <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-800">
          <div className="hidden grid-cols-[1fr_90px_190px_230px] gap-3 bg-zinc-900/80 px-3 py-2 text-xs uppercase tracking-[0.16em] text-zinc-500 md:grid">
            <span>Key</span>
            <span>Size</span>
            <span>Uploaded</span>
            <span>Actions</span>
          </div>
          {isLoading ? <div className="p-4 text-sm text-zinc-500">Loading files...</div> : null}
          {!isLoading && objects.length === 0 ? <div className="p-4 text-sm text-zinc-500">No objects listed.</div> : null}
          {objects.map((object) => (
            <ObjectRow
              key={object.key}
              record={record}
              object={object}
              onError={setError}
              onStatus={setStatus}
              onDelete={() => runAction(async () => {
                await deleteEndpointObject(record, object.key);
                setObjects((current) => current.filter((item) => item.key !== object.key));
                setStatus(`Deleted ${object.key}`);
              })}
            />
          ))}
        </div>

        {cursor ? (
          <button className="mt-4 h-10 w-full rounded-xl border border-zinc-700 text-sm text-zinc-300 hover:border-amber-300" onClick={() => runAction(loadMore)} type="button" disabled={isPending}>
            Load more
          </button>
        ) : null}
      </section>

      <SettingsPanel
        record={record}
        onUpdated={(next) => {
          const bucketChanged = next.workerBucketMode !== record.workerBucketMode || next.bucketBindingName !== record.bucketBindingName;
          setRecord(next);
          if (bucketChanged) {
            setStatus(`Switched to ${next.bucketBindingName || "default bucket"}`);
            void refreshObjects(next);
          }
        }}
        onError={setError}
        onStatus={setStatus}
      />
    </main>
  );
}

function UploadBox({
  record,
  disabled,
  resetToken,
  onDone,
  onError,
  onStatus,
}: {
  record: EndpointRecord;
  disabled: boolean;
  resetToken: number;
  onDone: () => void;
  onError: (message: string | null) => void;
  onStatus: (message: string | null) => void;
}) {
  const [key, setKey] = useState("");
  const [folder, setFolder] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [inputNonce, setInputNonce] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const [isEditingName, setIsEditingName] = useState(false);
  const [renameSalt, setRenameSalt] = useState("");
  const [isPending, startTransition] = useTransition();
  const activeRecord = findRecord(record.id) ?? record;
  const renameSignatureRef = useRef("");

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

    if (activeRecord.uploadSettings.duplicateStrategy === "rename") {
      const signature = `${file.name}:${file.size}:${file.lastModified}`;
      if (renameSignatureRef.current !== signature) {
        renameSignatureRef.current = signature;
        setRenameSalt(crypto.randomUUID().split("-")[4]);
      }
    } else {
      setRenameSalt("");
      renameSignatureRef.current = "";
    }
  }, [
    file,
    activeRecord.uploadSettings.duplicateStrategy,
    activeRecord.uploadSettings.imageUploadSettings.outputFormat,
  ]);

  const objectName = buildDerivedObjectName(file, key, activeRecord.uploadSettings, renameSalt);
  const resolvedName = buildPreviewKey(folder, objectName);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return;
    startTransition(async () => {
      onError(null);
      try {
        const requestKey = buildPreviewKey(folder, buildDerivedObjectName(file, key, activeRecord.uploadSettings, renameSalt));
        const result = await uploadEndpointObject(activeRecord, file, requestKey);
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
        const result = await createEndpointFolder(activeRecord, folder);
        onStatus(`Created folder ${result.key}`);
        onDone();
      } catch (cause) {
        onError(cause instanceof Error ? cause.message : "Could not create folder");
      }
    });
  }

  return (
    <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-3">
      <form className="grid gap-4" onSubmit={submit}>
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_auto] lg:items-end">
          <label className="flex h-11 cursor-pointer items-center justify-center rounded-xl border border-dashed border-zinc-700 px-3 text-sm text-zinc-300 hover:border-amber-300">
            <input key={inputNonce} className="sr-only" type="file" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
            <span className="truncate">{file ? file.name : "Choose file"}</span>
          </label>

          <label className="grid gap-1 text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
            Folder / Prefix
            <input
              className="h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-50 outline-none focus:border-amber-300"
              value={folder}
              onChange={(event) => setFolder(event.target.value)}
              placeholder="temp"
            />
          </label>

          <button className="h-11 rounded-xl border border-zinc-700 px-4 text-sm font-semibold text-zinc-200 hover:border-amber-300" type="button" disabled={disabled || isPending || !folder} onClick={createFolder}>
            Create folder
          </button>
        </div>

        <div className="grid gap-2">
          <div className="flex items-center justify-between gap-3 text-xs font-medium uppercase tracking-[0.16em] text-zinc-500">
            <span>Object Key</span>
            <span className="text-zinc-600">click to edit</span>
          </div>
          {isEditingName ? (
            <input
              autoFocus
              className="h-11 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-50 outline-none focus:border-amber-300"
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
              className="flex h-11 w-full items-center rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-left text-sm text-zinc-50 outline-none hover:border-amber-300"
              type="button"
              onClick={() => {
                setKey(objectName);
                setIsEditingName(true);
              }}
            >
              <span className="truncate">{resolvedName || "temp/name.jpg"}</span>
            </button>
          )}
          <p className="text-xs leading-5 text-zinc-500">Preview updates automatically. Folder is a prefix, so <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-200">temp</code> becomes <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-200">temp/name.jpg</code>.</p>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button className="h-11 rounded-xl bg-zinc-50 px-4 text-sm font-semibold text-zinc-950 hover:bg-amber-200" type="submit" disabled={disabled || isPending || !file}>
            {isPending ? "Uploading..." : "Upload"}
          </button>
        </div>
      </form>
      {history.length > 0 ? (
        <div className="mt-3 grid gap-2 border-t border-zinc-800 pt-3 text-xs text-zinc-400">
          {history.map((item, index) => (
            <p key={`${index}-${item}`} className="truncate rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2">{item}</p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ObjectRow({
  record,
  object,
  onDelete,
  onError,
  onStatus,
}: {
  record: EndpointRecord;
  object: R2ObjectSummary;
  onDelete: () => void;
  onError: (message: string | null) => void;
  onStatus: (message: string | null) => void;
}) {
  const publicUrl = publicUrlFor(record, object.key);

  async function copyPublicUrl() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      onStatus("Public URL copied");
    } catch {
      onError(publicUrl);
    }
  }

  return (
    <div className="grid gap-2 border-t border-zinc-800 px-3 py-3 text-sm text-zinc-400 md:grid-cols-[1fr_90px_190px_230px] md:items-center">
      <span className="truncate font-medium text-zinc-100" title={object.key}>{object.key}</span>
      <span>{formatBytes(object.size)}</span>
      <span>{object.uploaded ? new Date(object.uploaded).toLocaleString() : "-"}</span>
      <span className="flex flex-wrap gap-2">
        <button className="cursor-pointer rounded-lg border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-200 hover:border-amber-300" onClick={copyPublicUrl} type="button">
          Copy URL
        </button>
        <a
          className="rounded-lg border border-zinc-700 px-2.5 py-1.5 text-xs text-zinc-200 hover:border-amber-300"
          href={publicUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Open in new tab"
          aria-label="Open in new tab"
        >
          Open ↗
        </a>
        <button className="rounded-lg border border-red-900/70 px-2.5 py-1.5 text-xs text-red-300 hover:bg-red-950/40" onClick={onDelete} type="button">
          Delete
        </button>
      </span>
    </div>
  );
}

function SettingsPanel({
  record,
  onUpdated,
  onError,
  onStatus,
}: {
  record: EndpointRecord;
  onUpdated: (record: EndpointRecord) => void;
  onError: (message: string | null) => void;
  onStatus: (message: string | null) => void;
}) {
  const [form, setForm] = useState(() => ({ ...record, uploadSettings: { ...record.uploadSettings } }));
  const [saveState, setSaveState] = useState<"idle" | "saved">("idle");
  const saveFeedbackTimer = useRef<number | null>(null);

  useEffect(() => {
    setForm(record);
  }, [record]);

  useEffect(() => {
    return () => {
      if (saveFeedbackTimer.current !== null) window.clearTimeout(saveFeedbackTimer.current);
    };
  }, []);

  function markSaved() {
    setSaveState("saved");
    if (saveFeedbackTimer.current !== null) window.clearTimeout(saveFeedbackTimer.current);
    saveFeedbackTimer.current = window.setTimeout(() => setSaveState("idle"), SETTINGS_SAVED_FEEDBACK_MS);
  }

  function updateForm(next: EndpointRecord) {
    setForm(next);
    const records = saveEndpointRecord(next);
    const persisted = records.find((item) => item.id === record.id) ?? next;
    onUpdated(persisted);
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onError(null);
    try {
      const records = saveEndpointRecord(form);
      const next = records.find((item) => item.id === record.id) ?? record;
      setForm(next);
      onUpdated(next);
      onStatus("Endpoint settings saved");
      markSaved();
    } catch (cause) {
      onError(cause instanceof Error ? cause.message : "Could not save endpoint");
    }
  }

  return (
    <aside className="rounded-3xl border border-zinc-800/80 bg-zinc-950/80 p-5 shadow-2xl shadow-black/20 lg:sticky lg:top-4 lg:self-start">
      <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Settings</p>
      <h2 className="mt-1 text-2xl font-semibold text-zinc-50">Endpoint</h2>
      <p className="mt-2 text-sm leading-6 text-zinc-500">
        Control duplicate behavior and image transforms for this endpoint.
      </p>
      <form className="mt-5 grid gap-4" onSubmit={save}>
        <label className="grid gap-2 text-sm font-medium text-zinc-300">
          Workers Endpoint
          <input className="h-11 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-50 outline-none ring-0 focus:border-amber-300" value={form.endPoint} onChange={(event) => updateForm({ ...form, endPoint: event.target.value })} required />
        </label>
        <label className="grid gap-2 text-sm font-medium text-zinc-300">
          API Key
          <input className="h-11 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-50 outline-none ring-0 focus:border-amber-300" value={form.apiKey} onChange={(event) => updateForm({ ...form, apiKey: event.target.value })} type="password" required />
        </label>
        {form.workerBucketMode ? null : (
          <label className="grid gap-2 text-sm font-medium text-zinc-300">
            Custom Domain
            <input className="h-11 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-50 outline-none ring-0 focus:border-amber-300" value={form.customDomain} onChange={(event) => updateForm({ ...form, customDomain: event.target.value })} placeholder="https://r2.example.com" />
            <span className="text-xs leading-5 text-zinc-500">Enter the full URL including <code className="rounded bg-zinc-800 px-1 py-0.5 text-zinc-300">https://</code>. Leave blank to share through the Worker URL.</span>
          </label>
        )}
        <WorkerBucketPicker
          enabled={form.workerBucketMode}
          endpoint={form.endPoint}
          apiKey={form.apiKey}
          bucketId={form.bucketId}
          bucketName={form.bucketName}
          bucketBindingName={form.bucketBindingName}
          bucketDomains={form.bucketDomains}
          onEnabledChange={(enabled) => updateForm({
            ...form,
            workerBucketMode: enabled,
            bucketId: enabled ? form.bucketId : "",
            bucketName: enabled ? form.bucketName : "",
            bucketBindingName: enabled ? form.bucketBindingName : "",
          })}
          onBucketChange={(bucket) => updateForm({
            ...form,
            workerBucketMode: form.workerBucketMode,
            bucketId: bucket?.id ?? "",
            bucketName: bucket?.name ?? "",
            bucketBindingName: bucket?.bindingName ?? "",
          })}
          onBucketDomainsChange={(next) => updateForm({ ...form, bucketDomains: next })}
        />
        <label className="grid gap-2 text-sm font-medium text-zinc-300">
          Duplicate Handling
          <select
            className="h-11 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-50 outline-none ring-0 focus:border-amber-300"
            value={form.uploadSettings.duplicateStrategy}
            onChange={(event) => updateForm({ ...form, uploadSettings: { ...form.uploadSettings, duplicateStrategy: event.target.value as DuplicateStrategy } })}
          >
            <option value="keep">Do nothing</option>
            <option value="skip">Skip existing file</option>
            <option value="rename">Rename with random ID</option>
          </select>
          <span className="text-xs text-zinc-500">Do nothing keeps the chosen key and replaces whatever is already there. Rename generates a fresh random object key for each upload.</span>
        </label>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-zinc-100">Image upload settings</p>
            <p className="text-xs leading-5 text-zinc-500">Applied only to image files.</p>
          </div>

          <div className="mt-4 grid gap-3">
            <label className="flex items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-sm text-zinc-200">
              <span>
                Compress images before uploading
                <span className="block text-xs leading-5 text-zinc-500">Resize and convert images before sending them to R2.</span>
              </span>
              <input
                checked={form.uploadSettings.imageUploadSettings.compressImagesBeforeUploading}
                className="h-4 w-4 accent-amber-300"
                type="checkbox"
                onChange={(event) => updateForm({
                  ...form,
                  uploadSettings: {
                    ...form.uploadSettings,
                    imageUploadSettings: {
                      ...form.uploadSettings.imageUploadSettings,
                      compressImagesBeforeUploading: event.target.checked,
                    },
                  },
                })}
              />
            </label>

            <label className="flex items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-950/60 px-4 py-3 text-sm text-zinc-200">
              <span>
                Remove EXIF metadata
                <span className="block text-xs leading-5 text-zinc-500">Strips camera, timestamp, and location data.</span>
              </span>
              <input
                checked={form.uploadSettings.imageUploadSettings.removeExif}
                className="h-4 w-4 accent-amber-300"
                type="checkbox"
                onChange={(event) => updateForm({
                  ...form,
                  uploadSettings: {
                    ...form.uploadSettings,
                    imageUploadSettings: {
                      ...form.uploadSettings.imageUploadSettings,
                      removeExif: event.target.checked,
                    },
                  },
                })}
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-zinc-300">
              Output Format
              <select
                className="h-11 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-50 outline-none ring-0 focus:border-amber-300"
                value={form.uploadSettings.imageUploadSettings.outputFormat}
                onChange={(event) => updateForm({
                  ...form,
                  uploadSettings: {
                    ...form.uploadSettings,
                    imageUploadSettings: {
                      ...form.uploadSettings.imageUploadSettings,
                      outputFormat: event.target.value as ImageOutputFormat,
                    },
                  },
                })}
              >
                <option value="webp">webp</option>
                <option value="jpeg">jpeg</option>
                <option value="png">png</option>
              </select>
            </label>

            <label className="grid gap-2 text-sm font-medium text-zinc-300">
              Image Quality
              <input
                className="h-11 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-50 outline-none ring-0 focus:border-amber-300"
                min="0"
                max="1"
                step="0.05"
                type="number"
                value={form.uploadSettings.imageUploadSettings.imageQuality}
                onChange={(event) => updateForm({
                  ...form,
                  uploadSettings: {
                    ...form.uploadSettings,
                    imageUploadSettings: {
                      ...form.uploadSettings.imageUploadSettings,
                      imageQuality: Number(event.target.value),
                    },
                  },
                })}
              />
            </label>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-medium text-zinc-300">
                Max Width
              <input
                className="h-11 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-50 outline-none ring-0 focus:border-amber-300"
                min="1"
                placeholder="No limit"
                type="number"
                value={form.uploadSettings.imageUploadSettings.maxWidth ?? ""}
                onChange={(event) => updateForm({
                  ...form,
                  uploadSettings: {
                    ...form.uploadSettings,
                    imageUploadSettings: {
                        ...form.uploadSettings.imageUploadSettings,
                        maxWidth: event.target.value ? Number(event.target.value) : null,
                      },
                    },
                  })}
                />
              </label>

              <label className="grid gap-2 text-sm font-medium text-zinc-300">
                Max Height
              <input
                className="h-11 w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-50 outline-none ring-0 focus:border-amber-300"
                min="1"
                placeholder="No limit"
                type="number"
                value={form.uploadSettings.imageUploadSettings.maxHeight ?? ""}
                onChange={(event) => updateForm({
                  ...form,
                  uploadSettings: {
                    ...form.uploadSettings,
                    imageUploadSettings: {
                        ...form.uploadSettings.imageUploadSettings,
                        maxHeight: event.target.value ? Number(event.target.value) : null,
                      },
                    },
                  })}
                />
              </label>
            </div>
          </div>
        </section>

        <button
          className={`h-11 rounded-xl px-4 text-sm font-semibold transition-colors ${
            saveState === "saved"
              ? "bg-green-400 text-zinc-950 hover:bg-green-300"
              : "bg-zinc-50 text-zinc-950 hover:bg-amber-200"
          }`}
          type="submit"
        >
          {saveState === "saved" ? "Saved" : "Save settings"}
        </button>
      </form>
    </aside>
  );
}

function displayDomain(record: EndpointRecord): string {
  if (record.workerBucketMode && record.bucketBindingName) {
    return record.bucketDomains?.[record.bucketBindingName] || record.endPoint;
  }
  return record.customDomain || record.endPoint;
}

function findRecord(id: string): EndpointRecord | null {
  return listEndpointRecords().find((record) => record.id === id) ?? null;
}
