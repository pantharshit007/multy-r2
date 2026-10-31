import { Link } from "@tanstack/react-router";
import { FormEvent, useState } from "react";
import { deleteEndpointRecord, listEndpointRecords, saveEndpointRecord } from "../api";
import type { EndpointRecord } from "../../shared";
import { WorkerBucketPicker } from "../components/WorkerBucketPicker";
import { IconInput } from "../components/IconInput";
import { BucketIcon, ChevronRightIcon, GlobeIcon, HelpIcon, KeyIcon, PlusIcon, RefreshIcon, ServerIcon, TrashIcon } from "../components/Icons";
import { formatHost } from "../utils/format";

type EndpointForm = {
  endPoint: string;
  apiKey: string;
  customDomain: string;
  workerBucketMode: boolean;
  bucketId: string;
  bucketName: string;
  bucketBindingName: string;
  bucketDomains: Record<string, string>;
};

const EMPTY_FORM: EndpointForm = {
  endPoint: "",
  apiKey: "",
  customDomain: "",
  workerBucketMode: false,
  bucketId: "",
  bucketName: "",
  bucketBindingName: "",
  bucketDomains: {},
};

export function DashboardPage() {
  const [records, setRecords] = useState<EndpointRecord[]>(() => typeof window === "undefined" ? [] : listEndpointRecords());
  const [form, setForm] = useState<EndpointForm>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  function submitEndpoint(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    try {
      setRecords(saveEndpointRecord(form));
      setForm(EMPTY_FORM);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save endpoint");
    }
  }

  function removeRecord(id: string) {
    setRecords(deleteEndpointRecord(id));
  }

  return (
    <main className="animate-fade-in-up">
      <header className="mb-8 max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight text-balance text-fg sm:text-4xl">
          Manage Cloudflare R2 buckets in one place
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">
          Upload, browse, organize, and share files across multiple Cloudflare R2 buckets.
          Connect your own Workers to Multy R2, an open-source R2 file manager.
          Your endpoint settings and API keys stay in this browser’s local storage.
        </p>
        <Link to="/setup-guide" className="btn btn-secondary mt-5">
          <HelpIcon className="size-4" />
          New here? Read the setup guide
        </Link>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="panel min-w-0 overflow-hidden" aria-labelledby="endpoints-heading">
          <div className="panel-header">
            <div className="flex items-baseline gap-2">
              <h2 id="endpoints-heading" className="panel-title">Your endpoints</h2>
              <span className="text-xs text-subtle tabular-nums">{records.length}</span>
            </div>
            <button
              className="icon-btn"
              onClick={() => setRecords(listEndpointRecords())}
              type="button"
              title="Reload from local storage"
              aria-label="Reload endpoints"
            >
              <RefreshIcon className="size-4" />
            </button>
          </div>

          {records.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <span className="mx-auto flex size-10 items-center justify-center rounded-xl bg-raised text-muted">
                <ServerIcon className="size-5" />
              </span>
              <p className="mt-4 text-sm font-medium text-fg">No endpoints yet</p>
              <p className="mx-auto mt-1 max-w-sm text-[13px] text-muted">
                Add your Worker URL and API key to start managing a bucket.{" "}
                <Link to="/setup-guide" className="text-accent underline decoration-accent/30 underline-offset-4 hover:decoration-accent">
                  Need a Worker first?
                </Link>
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {records.map((record) => {
                const title = record.customDomain || record.endPoint;
                const bucket = record.workerBucketMode ? record.bucketBindingName || record.bucketName || "Multiple buckets" : null;
                return (
                  <li key={record.id} className="group flex items-center gap-2 pr-3 transition-colors hover:bg-raised/60">
                    <Link
                      to="/buckets/$bucketId"
                      params={{ bucketId: record.id }}
                      className="flex min-w-0 flex-1 items-center gap-3.5 py-3.5 pl-5"
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-raised text-muted group-hover:text-accent">
                        {record.customDomain ? <GlobeIcon className="size-4.5" /> : <ServerIcon className="size-4.5" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-sm font-medium text-fg">{formatHost(title)}</span>
                          {bucket ? (
                            <span className="chip h-5 max-w-[45%] min-w-0 px-1.5 text-[11px]" title={bucket}>
                              <BucketIcon className="size-3" />
                              <span className="truncate">{bucket}</span>
                            </span>
                          ) : null}
                        </span>
                        <span className="mt-0.5 block truncate font-mono text-xs text-subtle">{record.endPoint}</span>
                      </span>
                    </Link>
                    <button
                      className="icon-btn icon-btn-danger"
                      type="button"
                      onClick={() => removeRecord(record.id)}
                      title="Remove endpoint from this browser"
                      aria-label={`Remove ${formatHost(title)}`}
                    >
                      <TrashIcon className="size-4" />
                    </button>
                    <ChevronRightIcon className="size-4 shrink-0 text-subtle transition-transform group-hover:translate-x-0.5" />
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <aside className="panel min-w-0" aria-labelledby="new-endpoint-heading">
          <div className="panel-header">
            <h2 id="new-endpoint-heading" className="panel-title">Add endpoint</h2>
          </div>

          <form className="grid gap-4 p-5" onSubmit={submitEndpoint}>
            <label className="grid gap-1.5">
              <span className="label">Worker URL</span>
              <IconInput
                icon={<ServerIcon className="size-4" />}
                value={form.endPoint}
                onChange={(event) => setForm({ ...form, endPoint: event.target.value })}
                placeholder="https://bucket.user.workers.dev"
                required
              />
            </label>

            <label className="grid gap-1.5">
              <span className="label">API key</span>
              <IconInput
                icon={<KeyIcon className="size-4" />}
                value={form.apiKey}
                onChange={(event) => setForm({ ...form, apiKey: event.target.value })}
                placeholder="Your AUTH_KEY_SECRET value"
                type="password"
                autoComplete="off"
                required
              />
            </label>

            {form.workerBucketMode ? null : (
              <label className="grid gap-1.5">
                <span className="label">Custom domain <span className="font-normal text-subtle">(optional)</span></span>
                <IconInput
                  icon={<GlobeIcon className="size-4" />}
                  value={form.customDomain}
                  onChange={(event) => setForm({ ...form, customDomain: event.target.value })}
                  placeholder="https://r2.example.com"
                />
                <span className="hint">
                  Recommended for caching and edge serving. Needs a custom domain connected to your R2 bucket.
                </span>
              </label>
            )}

            <div className="border-t border-line pt-4">
              <WorkerBucketPicker
                enabled={form.workerBucketMode}
                endpoint={form.endPoint}
                apiKey={form.apiKey}
                bucketId={form.bucketId}
                bucketName={form.bucketName}
                bucketBindingName={form.bucketBindingName}
                bucketDomains={form.bucketDomains}
                onEnabledChange={(enabled) =>
                  setForm({
                    ...form,
                    workerBucketMode: enabled,
                    bucketId: enabled ? form.bucketId : "",
                    bucketName: enabled ? form.bucketName : "",
                    bucketBindingName: enabled ? form.bucketBindingName : "",
                  })
                }
                onBucketChange={(bucket) =>
                  setForm((current) => ({
                    ...current,
                    workerBucketMode: Boolean(bucket),
                    bucketId: bucket?.id ?? "",
                    bucketName: bucket?.name ?? "",
                    bucketBindingName: bucket?.bindingName ?? "",
                  }))
                }
                onBucketDomainsChange={(next) => setForm((current) => ({ ...current, bucketDomains: next }))}
              />
            </div>

            {error ? (
              <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">{error}</p>
            ) : null}

            <button className="btn btn-primary h-10 w-full" type="submit">
              <PlusIcon className="size-4" />
              Save endpoint
            </button>
            <p className="hint -mt-1 text-center">Saved to this browser’s local storage.</p>
          </form>
        </aside>
      </div>
    </main>
  );
}
