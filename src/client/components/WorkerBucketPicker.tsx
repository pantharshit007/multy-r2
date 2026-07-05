import { useEffect, useRef, useState } from "react";
import { listEndpointBucketBindings } from "../api";
import type { EndpointBucketBinding } from "../../shared";
import { normalizeApiBase } from "../lib/endpointResolver";
import { BUCKET_PICKER_DEBOUNCE_MS } from "../constants";

export function WorkerBucketPicker({
  enabled,
  endpoint,
  apiKey,
  bucketId,
  bucketName,
  bucketBindingName,
  bucketDomains,
  onEnabledChange,
  onBucketChange,
  onBucketDomainsChange,
}: {
  enabled: boolean;
  endpoint: string;
  apiKey: string;
  bucketId: string;
  bucketName: string;
  bucketBindingName: string;
  bucketDomains: Record<string, string>;
  onEnabledChange: (enabled: boolean) => void;
  onBucketChange: (bucket: EndpointBucketBinding | null) => void;
  onBucketDomainsChange: (next: Record<string, string>) => void;
}) {
  const [buckets, setBuckets] = useState<EndpointBucketBinding[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const onBucketChangeRef = useRef(onBucketChange);

  useEffect(() => {
    onBucketChangeRef.current = onBucketChange;
  }, [onBucketChange]);

  useEffect(() => {
    if (!enabled) {
      setBuckets([]);
      setLoading(false);
      setError(null);
      setStatus(null);
      return;
    }

    const normalized = normalizeApiBase(endpoint);
    if (!normalized || !apiKey.trim()) {
      setBuckets([]);
      setError(null);
      setStatus(null);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const list = await listEndpointBucketBindings({ endPoint: normalized, apiKey });
        if (cancelled) return;

        setBuckets(list);
        setStatus(list.length ? `Verified ${list.length} bound bucket${list.length === 1 ? "" : "s"}` : "No R2 bucket bindings found on this Worker");

        const next = list.find((item) => item.id === bucketId || item.bindingName === bucketBindingName) ?? list[0] ?? null;
        if (!next && (bucketId || bucketBindingName || bucketName)) {
          onBucketChangeRef.current(null);
        }

        if (next && (next.id !== bucketId || next.bindingName !== bucketBindingName)) {
          onBucketChangeRef.current(next);
        }
      } catch (cause) {
        if (cancelled) return;
        setBuckets([]);
        setError(cause instanceof Error ? cause.message : "Could not verify Worker buckets");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, BUCKET_PICKER_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [enabled, endpoint, apiKey, bucketId, bucketBindingName]);

  const selectedBucketId = buckets.find((bucket) => bucket.id === bucketId || bucket.bindingName === bucketBindingName)?.id ?? "";
  const activeBucket = buckets.find((bucket) => bucket.id === selectedBucketId) ?? null;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
      <label className="flex items-start justify-between gap-4">
        <span>
          <span className="block text-sm font-medium text-zinc-100">Multy multi-bucket Worker</span>
          <span className="mt-1 block text-xs leading-5 text-zinc-500">
            Check this when the endpoint is this app's Worker and should expose its active R2 bindings with the same API key.
          </span>
        </span>
        <input className="mt-1 h-4 w-4 accent-amber-300" type="checkbox" checked={enabled} onChange={(event) => onEnabledChange(event.target.checked)} />
      </label>

      {enabled ? (
        <div className="mt-4 grid gap-3">
          <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.16em] text-zinc-500">
            <span>Bucket</span>
            <span>{loading ? "Verifying..." : bucketBindingName || bucketName || "Select one"}</span>
          </div>

          <select
            className="h-11 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-50 outline-none focus:border-amber-300"
            value={selectedBucketId}
            onChange={(event) => {
              const next = buckets.find((item) => item.id === event.target.value) ?? null;
              onBucketChangeRef.current(next);
            }}
            disabled={!buckets.length || loading}
          >
            <option value="">{loading ? "Checking Worker bindings..." : "Select a bound bucket"}</option>
            {buckets.map((bucket) => (
              <option key={bucket.id} value={bucket.id}>
                {bucket.name}
              </option>
            ))}
          </select>

          {error ? <div className="rounded-xl border border-red-900/60 bg-red-950/40 p-3 text-sm text-red-200">{error}</div> : null}
          {status ? <div className="rounded-xl border border-green-900/60 bg-green-950/40 p-3 text-sm text-green-200">{status}</div> : null}
          {!loading && !error && buckets.length === 0 ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3 text-sm text-zinc-500">
              No buckets loaded yet.
            </div>
          ) : null}

          {activeBucket ? (
            <div className="grid gap-1.5 border-t border-zinc-800 pt-3">
              <span className="text-xs uppercase tracking-[0.16em] text-zinc-500">Domain for {activeBucket.name}</span>
              <input
                className="h-10 rounded-xl border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-50 outline-none focus:border-amber-300"
                placeholder="https://cdn.example.com"
                value={bucketDomains[activeBucket.bindingName] ?? ""}
                onChange={(event) => onBucketDomainsChange({ ...bucketDomains, [activeBucket.bindingName]: event.target.value })}
              />
              <span className="text-[11px] leading-4 text-zinc-500">
                Enter the full URL including <code className="rounded bg-zinc-800 px-1 py-0.5 text-zinc-300">https://</code>. Serves this
                bucket&apos;s share links (edge-cached); leave blank to use the Worker URL.
              </span>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
