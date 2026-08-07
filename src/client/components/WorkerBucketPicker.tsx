import { useEffect, useRef, useState } from "react";
import { listEndpointBucketBindings } from "../api";
import type { EndpointBucketBinding } from "../../shared";
import { normalizeApiBase } from "../lib/endpointResolver";
import { BUCKET_PICKER_DEBOUNCE_MS } from "../constants";
import { ChevronDownIcon, GlobeIcon, BucketIcon } from "./Icons";

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
  const activeDomain = activeBucket ? (bucketDomains[activeBucket.bindingName] ?? "").trim() : "";
  const domainMissing = Boolean(activeBucket && !activeDomain);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-4">
      <label className="flex items-start justify-between gap-4 cursor-pointer">
        <span>
          <span className="block text-sm font-semibold text-zinc-100">Multi-bucket Worker Scope</span>
          <span className="mt-1 block text-[10px] leading-relaxed text-zinc-500">
            Check this if your Cloudflare Worker serves multiple R2 bindings under the same API key.
          </span>
        </span>
        <input className="mt-1 h-4.5 w-4.5 rounded border-zinc-800 accent-amber-300 bg-zinc-900 cursor-pointer" type="checkbox" checked={enabled} onChange={(event) => onEnabledChange(event.target.checked)} />
      </label>

      {enabled ? (
        <div className="mt-4 grid gap-3">
          <div className="flex items-center justify-between gap-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
            <span>Selected Bucket Binding</span>
            <span className="text-[10px] text-zinc-600 font-normal">{loading ? "Verifying..." : bucketBindingName || bucketName || "Select one"}</span>
          </div>

          <div className="relative">
            <BucketIcon className="absolute left-3 top-3.5 size-4.5 text-zinc-600 pointer-events-none" />
            <select
              className="h-11 w-full appearance-none rounded-xl border border-zinc-800 bg-zinc-900/60 pl-9.5 pr-10 text-sm text-zinc-50 outline-none focus:border-amber-300/80 transition-all cursor-pointer"
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
            <ChevronDownIcon className="absolute right-3 top-3.5 size-4.5 text-zinc-500 pointer-events-none" />
          </div>

          {error ? <div className="rounded-xl border border-red-900/40 bg-red-950/20 p-3 text-xs text-red-300">{error}</div> : null}
          {status ? <div className="rounded-xl border border-green-900/40 bg-green-950/20 p-3 text-xs text-green-300">{status}</div> : null}
          {!loading && !error && buckets.length === 0 ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-3 text-xs text-zinc-500">
              No buckets loaded yet. Ensure your worker is running and correctly bound.
            </div>
          ) : null}

          {activeBucket ? (
            <div className="grid gap-1.5 border-t border-zinc-850 pt-3">
              <span
                className={`text-[10px] font-semibold uppercase tracking-[0.16em] ${
                  domainMissing ? "text-red-400" : "text-zinc-500"
                }`}
              >
                Domain for {activeBucket.name}
                {domainMissing ? " — not assigned" : ""}
              </span>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center text-zinc-600">
                  <GlobeIcon className="size-4" />
                </span>
                <input
                  className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900/60 pl-9.5 pr-3 text-sm text-zinc-50 outline-none focus:border-amber-300/80 focus:bg-zinc-900/80 transition-all"
                  placeholder="https://cdn.example.com"
                  value={bucketDomains[activeBucket.bindingName] ?? ""}
                  onChange={(event) => onBucketDomainsChange({ ...bucketDomains, [activeBucket.bindingName]: event.target.value })}
                />
              </div>
              <span className="text-[10px] leading-relaxed text-zinc-500">
                Enter the full URL including <code className="bg-zinc-900 px-1 py-0.5 rounded text-zinc-400">https://</code>. Serves this bucket&apos;s share links. Leave blank to fallback to Worker endpoint.
              </span>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
