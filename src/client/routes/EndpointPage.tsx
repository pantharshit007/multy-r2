import { Link, useParams } from "@tanstack/react-router";
import { useCallback, useEffect, useState, useTransition } from "react";
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
import { Toasts } from "../components/Toasts";
import { RefreshIcon, ArrowLeftIcon, ChevronRightIcon, ServerIcon, GlobeIcon, BucketIcon } from "../components/Icons";
import { REFRESH_FEEDBACK_MIN_MS } from "../constants";
import { formatHost } from "../utils/format";

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

  const dismissError = useCallback(() => setError(null), []);
  const dismissStatus = useCallback(() => setStatus(null), []);

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
      <main className="panel mx-auto mt-12 max-w-md p-8 text-center animate-fade-in-up">
        <h1 className="text-base font-semibold text-fg">Endpoint not found</h1>
        <p className="mt-1.5 text-sm text-muted">It may have been removed from this browser.</p>
        <Link to="/" className="btn btn-secondary mt-5">
          <ArrowLeftIcon className="size-3.5" />
          <span>Back to endpoints</span>
        </Link>
      </main>
    );
  }

  const domain = displayDomain(record);
  const bucketLabel = record.workerBucketMode ? record.bucketBindingName || record.bucketName || "No bucket selected" : null;

  return (
    <main className="animate-fade-in-up">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[13px] text-muted">
        <Link to="/" className="inline-flex items-center gap-1.5 rounded-md hover:text-fg">
          <ArrowLeftIcon className="size-3.5" />
          Endpoints
        </Link>
        <ChevronRightIcon className="size-3 text-subtle" />
        <span className="truncate text-fg">{formatHost(domain)}</span>
      </nav>

      <header className="mt-3 mb-6 min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight break-all text-fg sm:text-[28px]">{formatHost(domain)}</h1>
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <span className="chip font-mono font-normal" title="Worker endpoint">
            <ServerIcon className="size-3.5" />
            <span className="max-w-[18rem] truncate">{record.endPoint}</span>
          </span>
          {domain !== record.endPoint ? (
            <span className="chip font-mono font-normal" title="Public share domain">
              <GlobeIcon className="size-3.5" />
              <span className="max-w-[18rem] truncate">{domain}</span>
            </span>
          ) : null}
          {bucketLabel ? (
            <span className="chip" title="Selected bucket binding">
              <BucketIcon className="size-3.5" />
              {bucketLabel}
            </span>
          ) : null}
          <span className="chip" title="Requests are sent with the x-api-key header">
            <span className="dot bg-success" />
            API key set
          </span>
        </div>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="grid min-w-0 gap-6">
          <UploadBox
            record={record}
            disabled={isPending}
            resetToken={uploadLogReset}
            onDone={() => runAction(() => refreshObjects())}
            onError={setError}
            onStatus={setStatus}
          />

          <section className="panel min-w-0 overflow-hidden" aria-labelledby="files-heading">
            <div className="panel-header">
              <div className="flex min-w-0 items-baseline gap-2">
                <h2 id="files-heading" className="panel-title">Files</h2>
                {!isLoading ? (
                  <span className="text-xs text-subtle tabular-nums">
                    {objects.length}{cursor ? "+" : ""} {objects.length === 1 && !cursor ? "object" : "objects"}
                  </span>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <div role="group" aria-label="Directory view" className="segmented">
                  {(["list", "tree"] as const).map((mode) => (
                    <button key={mode} type="button" aria-pressed={view === mode} onClick={() => { setView(mode); saveDirectoryView(mode); }}>
                      {mode === "list" ? "List" : "Tree"}
                    </button>
                  ))}
                </div>
                <button
                  className="btn btn-ghost h-8 px-2.5"
                  onClick={() => void refreshList()}
                  type="button"
                  disabled={isPending || isRefreshing}
                  aria-busy={isRefreshing}
                  title="Reload the object list"
                >
                  <RefreshIcon className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
                  <span className="hidden sm:inline">{isRefreshing ? "Refreshing…" : "Refresh"}</span>
                </button>
              </div>
            </div>

            {view === "list" && objects.length > 0 && !isLoading ? (
              <div className="hidden grid-cols-[minmax(0,1fr)_5.5rem_10.5rem_6.5rem] gap-3 border-b border-line bg-inset px-5 py-2 text-xs font-medium text-subtle md:grid">
                <span>Name</span>
                <span className="text-right">Size</span>
                <span>Uploaded</span>
                <span className="sr-only">Actions</span>
              </div>
            ) : null}

            {isLoading ? (
              <FileSkeleton />
            ) : objects.length === 0 ? (
              <div className="px-6 py-14 text-center">
                <p className="text-sm font-medium text-fg">This bucket is empty</p>
                <p className="mt-1 text-[13px] text-muted">Drop a file anywhere on the page, or use the upload area above.</p>
              </div>
            ) : view === "tree" ? (
              <ObjectTree key={`${record.id}:${record.endPoint}:${record.workerBucketMode}:${record.bucketBindingName}`} record={record} objects={objects} hasMore={Boolean(cursor)} onCreated={(path) => { runAction(async () => { await refreshObjects(); setStatus(`Created folder ${path}/`); }); }} onDelete={setObjectPendingDeletion} onError={setError} onStatus={setStatus} />
            ) : (
              <div className="divide-y divide-line">
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

            {cursor ? (
              <div className="border-t border-line p-3">
                <button
                  className="btn btn-ghost w-full"
                  onClick={() => runAction(loadMore)}
                  type="button"
                  disabled={isPending || isRefreshing}
                >
                  Load more
                </button>
              </div>
            ) : null}
          </section>
        </div>

        <SettingsPanel
          record={record}
          onUpdated={(next) => {
            const bucketChanged = next.workerBucketMode !== record.workerBucketMode || next.bucketBindingName !== record.bucketBindingName;
            setRecord(next);
            if (bucketChanged) {
              setStatus(`Switched to bucket "${next.bucketBindingName || "default"}"`);
              void refreshObjects(next);
            }
          }}
          onError={setError}
          onStatus={setStatus}
        />
      </div>

      <DeleteObjectDialog
        objectKey={objectPendingDeletion?.key ?? null}
        isDeleting={isPending}
        onCancel={() => setObjectPendingDeletion(null)}
        onConfirm={confirmDelete}
      />
      <Toasts error={error} status={status} onDismissError={dismissError} onDismissStatus={dismissStatus} />
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
