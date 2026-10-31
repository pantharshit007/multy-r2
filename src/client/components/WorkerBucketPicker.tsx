import { useEffect, useRef, useState } from "react";
import { listEndpointBucketBindings } from "../api";
import type { EndpointBucketBinding } from "../../shared";
import { normalizeApiBase } from "../lib/endpointResolver";
import { BUCKET_PICKER_DEBOUNCE_MS } from "../constants";
import { IconInput } from "./IconInput";
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
        setStatus(list.length ? `${list.length} found` : null);

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
    <div className="grid gap-4">
      <label className="flex cursor-pointer items-start justify-between gap-4">
        <span>
          <span className="block text-[13px] font-medium text-fg">Multiple buckets</span>
          <span className="mt-0.5 block text-xs leading-relaxed text-muted">
            Turn on if this Worker serves several R2 bindings with one API key.
          </span>
        </span>
        <input className="switch" type="checkbox" role="switch" checked={enabled} onChange={(event) => onEnabledChange(event.target.checked)} />
      </label>

      {enabled ? (
        <div className="grid gap-3">
          <label className="grid gap-1.5">
            <span className="flex items-center justify-between gap-3">
              <span className="label">Bucket</span>
              {loading ? <span className="text-xs text-subtle">Checking…</span> : status ? <span className="flex items-center gap-1.5 text-xs text-subtle"><span className="dot bg-success" />{status}</span> : null}
            </span>
            <div className="relative">
              <span className="field-icon">
                <BucketIcon className="size-4" />
              </span>
              <select
                className="field field-with-icon cursor-pointer appearance-none pr-9"
                value={selectedBucketId}
                onChange={(event) => {
                  const next = buckets.find((item) => item.id === event.target.value) ?? null;
                  onBucketChangeRef.current(next);
                }}
                disabled={!buckets.length || loading}
              >
                <option value="">{loading ? "Checking Worker bindings…" : "Select a bucket"}</option>
                {buckets.map((bucket) => (
                  <option key={bucket.id} value={bucket.id}>
                    {bucket.name}
                  </option>
                ))}
              </select>
              <ChevronDownIcon className="pointer-events-none absolute top-3 right-3 size-4 text-subtle" />
            </div>
          </label>

          {error ? <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p> : null}
          {!loading && !error && buckets.length === 0 ? (
            <p className="hint">No buckets found yet. Check that the Worker URL and API key are correct and the Worker has R2 bindings.</p>
          ) : null}

          {activeBucket ? (
            <label className="grid gap-1.5">
              <span className="label">
                Domain for {activeBucket.name}
                {domainMissing ? <span className="ml-1.5 font-normal text-subtle">(not set)</span> : null}
              </span>
              <IconInput
                icon={<GlobeIcon className="size-4" />}
                placeholder="https://cdn.example.com"
                value={bucketDomains[activeBucket.bindingName] ?? ""}
                onChange={(event) => onBucketDomainsChange({ ...bucketDomains, [activeBucket.bindingName]: event.target.value })}
              />
              <span className="hint">
                Used for this bucket&apos;s share links. Include <code className="code-inline">https://</code>. Leave blank to share through the Worker URL.
              </span>
            </label>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
