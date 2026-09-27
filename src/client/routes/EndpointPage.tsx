import { Link, useParams } from "@tanstack/react-router";
import { useEffect, useState, useTransition } from "react";
import {
  deleteEndpointObject,
  listEndpointObjects,
  listEndpointRecords,
} from "../api";
import type { EndpointRecord, R2ObjectSummary } from "../../shared";
import { UploadBox } from "../components/UploadBox";
import { ObjectTree } from "../components/ObjectTree";
import { invalidateFolderCache } from "../lib/folderCache";
import { readDirectoryView, saveDirectoryView } from "../lib/directoryView";
import type { DirectoryView } from "../types/objectTree";
import { ObjectRow } from "../components/ObjectRow";
import { SettingsPanel } from "../components/SettingsPanel";
import { FileSkeleton } from "../components/FileSkeleton";
import { DeleteObjectDialog } from "../components/DeleteObjectDialog";
import { RefreshIcon, ArrowLeftIcon } from "../components/Icons";
import { REFRESH_FEEDBACK_MIN_MS, UPLOAD_LIMITS, CLOUDFLARE_UPLOAD_LIMITS_URL } from "../constants";

/** Manage objects and upload settings for the selected endpoint record. */
export function EndpointPage() {
  const { bucketId } = useParams({ from: "/buckets/$bucketId" });
  const [record, setRecord] = useState<EndpointRecord | null>(() => findRecord(bucketId));
  const [view, setView] = useState<DirectoryView>(readDirectoryView);
  const [objects, setObjects] = useState<R2ObjectSummary[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [uploadLogReset, setUploadLogReset] = useState(0);
  const [objectPendingDeletion, setObjectPendingDeletion] = useState<R2ObjectSummary | null>(null);

  useEffect(() => {
    const next = findRecord(bucketId);
    setRecord(next);
    if (next) void refreshObjects(next);
    else setIsLoading(false);
  }, [bucketId]);

  /** Replace the object page using the requested endpoint scope. */
  async function refreshObjects(target = record) {
    if (!target) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await listEndpointObjects(target);
      setObjects(response.objects);
      setCursor(response.cursor);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load R2 objects");
    } finally {
      setIsLoading(false);
    }
  }

  /** Run a pending action with shared status and error handling. */
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

  /** Append the next object page while retaining the existing rows. */
  async function loadMore() {
    if (!record || !cursor || isRefreshing) return;
    const response = await listEndpointObjects(record, cursor);
    setObjects((current) => [...current, ...response.objects]);
    setCursor(response.cursor);
  }

  /** Invalidate folder discovery and reload objects with refresh feedback. */
  async function refreshList() {
    if (record) invalidateFolderCache(record);
    setStatus(null);
    setUploadLogReset((current) => current + 1);
    setIsRefreshing(true);
    const startedAt = Date.now();
    try {
      await refreshObjects();
    } finally {
      const elapsed = Date.now() - startedAt;
      const remaining = REFRESH_FEEDBACK_MIN_MS - elapsed;
      if (remaining > 0) {
        await new Promise((resolve) => setTimeout(resolve, remaining));
      }
      setIsRefreshing(false);
    }
  }

  /** Delete the confirmed object and remove its row after success. */
  function confirmDelete() {
    if (!record || !objectPendingDeletion) return;

    const object = objectPendingDeletion;
    startTransition(async () => {
      setError(null);
      setStatus(null);
      try {
        await deleteEndpointObject(record, object.key);
        setObjects((current) => current.filter((item) => item.key !== object.key));
        setObjectPendingDeletion(null);
        setStatus(`Deleted object "${object.key}" successfully.`);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not delete object");
      }
    });
  }

  if (!record) {
    return (
      <main className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-6 backdrop-blur-xl animate-fade-in-up text-center max-w-md mx-auto mt-12">
        <p className="text-sm text-zinc-400 font-medium">Specified endpoint was not found.</p>
        <Link
          to="/"
          className="mt-5 inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-4 py-2 text-xs font-semibold text-zinc-200 hover:border-amber-300 hover:text-amber-200 hover:bg-amber-300/5 transition-all"
        >
          <ArrowLeftIcon className="size-3.5" />
          <span>Back to saved endpoints</span>
        </Link>
      </main>
    );
  }

  return (
    <main className="grid gap-5 lg:grid-cols-[1fr_420px] animate-fade-in-up">
      {/* Endpoint Page Header Details */}
      <section className="rounded-3xl border border-zinc-800/80 bg-zinc-950/70 p-6 shadow-2xl backdrop-blur-xl lg:col-span-2 relative overflow-hidden">
        {/* Decorative backdrop light */}
        <div className="absolute right-0 top-0 -z-10 h-32 w-32 rounded-full bg-amber-500/5 blur-3xl" />
        
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-300 hover:text-amber-200 transition-colors group"
        >
          <ArrowLeftIcon className="size-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to endpoints</span>
        </Link>
        
        <div className="mt-4 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-zinc-500">Selected Endpoint</p>
            <h1 className="mt-1 break-all text-3xl font-extrabold tracking-tight text-zinc-50 font-display">
              {displayDomain(record)}
            </h1>
            <p className="mt-1 break-all text-xs font-mono text-zinc-500">{record.endPoint}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {record.workerBucketMode ? (
              <span className="w-fit rounded-xl border border-green-400/20 bg-green-400/5 px-3 py-1.5 text-xs font-medium text-green-300">
                bucket: {record.bucketBindingName || record.bucketName || "multi-bucket"}
              </span>
            ) : null}
            <span className="w-fit rounded-xl border border-amber-300/20 bg-amber-300/5 px-3 py-1.5 text-xs font-medium text-amber-200">
              x-api-key active
            </span>
          </div>
        </div>
      </section>

      {/* R2 Object List & Upload Area */}
      <section className="min-w-0 rounded-3xl border border-zinc-800/80 bg-zinc-950/70 p-6 shadow-2xl backdrop-blur-xl flex flex-col">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-zinc-500">R2 Storage Objects</p>
            <h2 className="mt-0.5 text-2xl font-bold tracking-tight text-zinc-50 font-display">Files Directory</h2>
          </div>
          <button
            className={`group flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all disabled:cursor-not-allowed ${
              isRefreshing
                ? "border-amber-300/60 bg-amber-300/10 text-amber-200 shadow-[0_0_18px_rgba(252,211,77,0.12)]"
                : "border-zinc-700 bg-zinc-900/40 text-zinc-300 hover:border-amber-300 hover:text-amber-200 hover:bg-amber-300/5"
            }`}
            onClick={() => void refreshList()}
            type="button"
            disabled={isPending || isRefreshing}
            aria-busy={isRefreshing}
            aria-live="polite"
          >
            <RefreshIcon
              className={`size-3.5 ${
                isRefreshing
                  ? "animate-spin"
                  : "transition-transform duration-500 group-hover:rotate-180"
              }`}
            />
            <span>{isRefreshing ? "Refreshing…" : "Refresh list"}</span>
          </button>
        </div>

        <div className="mt-2 space-y-1.5 text-[11px] leading-relaxed">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-zinc-500">Upload size per file</span>
            <ul className="flex flex-wrap items-center gap-x-3 gap-y-1" aria-label="Cloudflare upload limits">
              {UPLOAD_LIMITS.map(({ plan, limit }) => <li key={plan} className="inline-flex items-center gap-2">
                <span aria-hidden="true" className="size-1 shrink-0 rounded-full bg-amber-400" />
                <span className="text-zinc-500">{plan} <span className="ml-1 font-semibold text-zinc-300">{limit}</span></span>
              </li>)}
            </ul>
          </div>
          <p className="text-zinc-500">
            Your endpoint may set a lower limit.{" "}
            <a href={CLOUDFLARE_UPLOAD_LIMITS_URL} target="_blank" rel="noopener noreferrer" className="ml-1 underline underline-offset-2 hover:text-zinc-300">View limits</a>
          </p>
        </div>

        {/* Global Notifications inside the file panel */}
        {error ? (
          <div className="mt-4 rounded-2xl border border-red-900/40 bg-red-950/20 p-3.5 text-xs text-red-300 animate-fade-in-up">
            <strong className="block font-bold mb-0.5">Error</strong>
            {error}
          </div>
        ) : null}
        
        {status ? (
          <div className="mt-4 rounded-2xl border border-green-900/40 bg-green-950/20 p-3.5 text-xs text-green-300 animate-fade-in-up">
            <strong className="block font-bold mb-0.5">Success</strong>
            {status}
          </div>
        ) : null}

        {/* Dropzone File Upload box */}
        <UploadBox
          record={record}
          disabled={isPending}
          resetToken={uploadLogReset}
          onDone={() => runAction(() => refreshObjects())}
          onError={setError}
          onStatus={setStatus}
        />

        <div className="mt-6 flex items-center justify-between gap-3">
          <span className="text-xs text-zinc-500">Browse objects</span>
          <div role="group" aria-label="Directory view" className="inline-flex rounded-xl border border-zinc-800 bg-zinc-900/40 p-1">
            {(["list", "tree"] as const).map((mode) => <button key={mode} type="button" aria-pressed={view === mode} onClick={() => { setView(mode); saveDirectoryView(mode); }}
              className={`rounded-lg px-4 py-1.5 text-xs font-semibold transition-colors ${view === mode ? "bg-amber-300/10 text-amber-200" : "text-zinc-500 hover:text-zinc-200"}`}>
              {mode === "list" ? "List" : "Tree"}
            </button>)}
          </div>
        </div>

        {/* Object Tables */}
        <div className="mt-3 overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/20">
          {view === "list" && <div className="hidden grid-cols-[minmax(0,1fr)_4.5rem_9.5rem_6.75rem] gap-2 bg-zinc-900/40 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 border-b border-zinc-850 md:grid">
            <span>Object Key</span>
            <span>Size</span>
            <span>Uploaded On</span>
            <span className="text-right">Actions</span>
          </div>}

          {isLoading ? (
            <FileSkeleton />
          ) : objects.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-500 font-medium bg-zinc-900/5">
              No files found in this bucket. Choose or drag a file above to begin uploading.
            </div>
          ) : view === "tree" ? (
            <ObjectTree key={`${record.id}:${record.endPoint}:${record.workerBucketMode}:${record.bucketBindingName}`} record={record} objects={objects} hasMore={Boolean(cursor)} onCreated={(path) => { runAction(async () => { await refreshObjects(); setStatus(`Created folder ${path}/`); }); }} onDelete={setObjectPendingDeletion} onError={setError} onStatus={setStatus} />
          ) : (
            <div className="divide-y divide-zinc-800/40">
              {objects.map((object) => (
                <ObjectRow
                  key={object.key}
                  record={record}
                  object={object}
                  onError={setError}
                  onStatus={setStatus}
                  onDelete={() => setObjectPendingDeletion(object)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {cursor ? (
          <button
            className="mt-4 h-10 w-full rounded-xl border border-zinc-700 bg-zinc-900/30 text-xs font-semibold text-zinc-300 hover:border-amber-300 hover:text-amber-200 hover:bg-amber-300/5 transition-all disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => runAction(loadMore)}
            type="button"
            disabled={isPending || isRefreshing}
          >
            Load more objects
          </button>
        ) : null}
      </section>

      {/* Aside Settings Panel */}
      <SettingsPanel
        record={record}
        onUpdated={(next) => {
          const bucketChanged = next.workerBucketMode !== record.workerBucketMode || next.bucketBindingName !== record.bucketBindingName;
          setRecord(next);
          if (bucketChanged) {
            setStatus(`Switched context to binding "${next.bucketBindingName || "default bucket"}"`);
            void refreshObjects(next);
          }
        }}
        onError={setError}
        onStatus={setStatus}
      />
      <DeleteObjectDialog
        objectKey={objectPendingDeletion?.key ?? null}
        isDeleting={isPending}
        onCancel={() => setObjectPendingDeletion(null)}
        onConfirm={confirmDelete}
      />
    </main>
  );
}

/** Choose the display domain for the active bucket or endpoint. */
function displayDomain(record: EndpointRecord): string {
  if (record.workerBucketMode && record.bucketBindingName) {
    return record.bucketDomains?.[record.bucketBindingName] || record.endPoint;
  }
  return record.customDomain || record.endPoint;
}

/** Look up the route endpoint in the locally saved records. */
function findRecord(id: string): EndpointRecord | null {
  return listEndpointRecords().find((record) => record.id === id) ?? null;
}
