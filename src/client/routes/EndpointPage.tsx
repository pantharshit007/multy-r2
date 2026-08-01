import { Link, useParams } from "@tanstack/react-router";
import { useEffect, useState, useTransition } from "react";
import {
  deleteEndpointObject,
  listEndpointObjects,
  listEndpointRecords,
} from "../api";
import type { EndpointRecord, R2ObjectSummary } from "../../shared";
import { UploadBox } from "../components/UploadBox";
import { ObjectRow } from "../components/ObjectRow";
import { SettingsPanel } from "../components/SettingsPanel";
import { FileSkeleton } from "../components/FileSkeleton";
import { RefreshIcon, ArrowLeftIcon } from "../components/Icons";

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
      setError(cause instanceof Error ? cause.message : "Could not load R2 objects");
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
            className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/40 px-3.5 py-2 text-xs font-semibold text-zinc-300 hover:border-amber-300 hover:text-amber-200 hover:bg-amber-300/5 transition-all group"
            onClick={() => {
              setStatus(null);
              setUploadLogReset((current) => current + 1);
              runAction(() => refreshObjects());
            }}
            type="button"
            disabled={isPending}
          >
            <RefreshIcon className="size-3.5 group-hover:rotate-180 transition-transform duration-500" />
            <span>Refresh list</span>
          </button>
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

        {/* Object Tables */}
        <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/20">
          <div className="hidden grid-cols-[1fr_90px_190px_230px] gap-3 bg-zinc-900/40 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-500 border-b border-zinc-850 md:grid">
            <span>Object Key</span>
            <span>Size</span>
            <span>Uploaded On</span>
            <span>Actions</span>
          </div>

          {isLoading ? (
            <FileSkeleton />
          ) : objects.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-500 font-medium bg-zinc-900/5">
              No files found in this bucket. Choose or drag a file above to begin uploading.
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/40">
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
                    setStatus(`Deleted object "${object.key}" successfully.`);
                  })}
                />
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {cursor ? (
          <button
            className="mt-4 h-10 w-full rounded-xl border border-zinc-700 bg-zinc-900/30 text-xs font-semibold text-zinc-300 hover:border-amber-300 hover:text-amber-200 hover:bg-amber-300/5 transition-all"
            onClick={() => runAction(loadMore)}
            type="button"
            disabled={isPending}
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
    </main>
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
