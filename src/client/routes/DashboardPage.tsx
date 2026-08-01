import { Link } from "@tanstack/react-router";
import { FormEvent, useState } from "react";
import { deleteEndpointRecord, listEndpointRecords, saveEndpointRecord } from "../api";
import type { EndpointRecord } from "../../shared";
import { WorkerBucketPicker } from "../components/WorkerBucketPicker";
import { ServerIcon, GlobeIcon, KeyIcon, RefreshIcon, TrashIcon } from "../components/Icons";

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
  const [records, setRecords] = useState<EndpointRecord[]>(() => listEndpointRecords());
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
    <main className="grid gap-5 lg:grid-cols-[1fr_380px] animate-fade-in-up">
      {/* Hero Header Section */}
      <section className="rounded-3xl border border-zinc-800/80 bg-zinc-950/70 p-6 shadow-2xl backdrop-blur-xl lg:col-span-2 relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute left-1/4 top-0 -z-10 h-32 w-80 rounded-full bg-amber-500/5 blur-3xl" />
        
        <div className="text-xs font-bold uppercase tracking-[0.25em] text-amber-300">R2 Endpoint Admin</div>
        <h1 className="mt-3.5 max-w-3xl text-4xl font-extrabold tracking-tight text-zinc-50 sm:text-5xl font-display leading-[1.1]">
          Manage Saved Worker Endpoints
        </h1>
        <p className="mt-3 max-w-2xl text-xs sm:text-sm leading-relaxed text-zinc-400">
          Store your Cloudflare Worker endpoint URL, API keys, and bucket binding paths in localStorage. 
          The API key is securely transmitted via <code className="bg-zinc-900 px-1.5 py-0.5 rounded text-amber-200 border border-zinc-800 font-mono text-xs">x-api-key</code> headers during client requests.
        </p>
      </section>

      {/* LocalStorage Endpoints list */}
      <section className="rounded-3xl border border-zinc-800/80 bg-zinc-950/70 p-6 shadow-2xl backdrop-blur-xl flex flex-col">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-zinc-500">LocalStorage</p>
            <h2 className="mt-0.5 text-2xl font-bold tracking-tight text-zinc-50 font-display">Active Endpoints</h2>
          </div>
          <button
            className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/40 px-3.5 py-2 text-xs font-semibold text-zinc-300 hover:border-amber-300 hover:text-amber-200 hover:bg-amber-300/5 transition-all group"
            onClick={() => setRecords(listEndpointRecords())}
            type="button"
          >
            <RefreshIcon className="size-3.5 group-hover:rotate-180 transition-transform duration-500" />
            <span>Refresh</span>
          </button>
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-900/40 bg-red-950/20 p-3.5 text-xs text-red-300 animate-fade-in-up">
            {error}
          </div>
        ) : null}

        {records.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-zinc-850 bg-zinc-900/10 p-5 text-center text-xs text-zinc-400 font-medium">
            <strong className="block text-zinc-200 mb-1 text-sm font-bold font-display">No endpoints configured yet.</strong>
            Add your worker credentials in the right panel to begin managing your buckets.
          </div>
        ) : null}

        <div className="mt-5 grid gap-3.5">
          {records.map((record) => (
            <div
              key={record.id}
              className="rounded-2xl border border-zinc-800/80 bg-zinc-900/20 p-4 hover:border-amber-300/30 hover:bg-zinc-900/40 hover:scale-[1.01] transition-all duration-200 group relative flex flex-col justify-between"
            >
              <Link to="/buckets/$bucketId" params={{ bucketId: record.id }} className="block">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-500 group-hover:border-zinc-700 group-hover:text-amber-300 transition-colors">
                    {record.customDomain ? (
                      <GlobeIcon className="size-4.5" />
                    ) : (
                      <ServerIcon className="size-4.5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-bold text-zinc-100 group-hover:text-amber-200 transition-colors">
                      {record.customDomain || record.endPoint}
                    </h3>
                    <p className="mt-0.5 truncate text-[11px] font-mono text-zinc-500">{record.endPoint}</p>
                  </div>
                </div>
              </Link>
              
              <div className="mt-4 flex items-center justify-between border-t border-zinc-850/50 pt-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-xl border border-amber-300/20 bg-amber-300/5 px-2.5 py-1 text-[10px] font-semibold tracking-wider text-amber-200 uppercase">
                    endpoint
                  </span>
                  {record.workerBucketMode ? (
                    <span className="rounded-xl border border-green-400/20 bg-green-400/5 px-2.5 py-1 text-[10px] font-semibold tracking-wider text-green-200 uppercase">
                      {record.bucketBindingName || record.bucketName || "multi-bucket"}
                    </span>
                  ) : null}
                </div>
                
                <button
                  className="flex items-center gap-1 cursor-pointer rounded-xl border border-red-900/60 px-2.5 py-1.5 text-[10px] font-bold text-red-400 hover:bg-red-950/40 hover:border-red-800 transition-all"
                  type="button"
                  onClick={() => removeRecord(record.id)}
                >
                  <TrashIcon className="size-3" />
                  <span>Remove</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Add New Endpoint sidebar/aside */}
      <aside className="rounded-3xl border border-zinc-800/80 bg-zinc-950/80 p-6 shadow-2xl backdrop-blur-xl lg:sticky lg:top-4 lg:self-start">
        <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-zinc-500">Configure connection</p>
        <h2 className="mt-0.5 text-2xl font-bold tracking-tight text-zinc-50 font-display">New Endpoint</h2>
        
        <form className="mt-5 grid gap-4.5" onSubmit={submitEndpoint}>
          {/* Workers Endpoint Input */}
          <label className="grid gap-1.5 text-xs font-semibold text-zinc-400">
            <span>Workers Endpoint</span>
            <div className="relative">
              <ServerIcon className="absolute left-3 top-3.5 size-4 text-zinc-600" />
              <input
                className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900/60 pl-9.5 pr-3 text-sm text-zinc-50 outline-none focus:border-amber-300/80 focus:bg-zinc-900/80 transition-all"
                value={form.endPoint}
                onChange={(event) => setForm({ ...form, endPoint: event.target.value })}
                placeholder="https://bucket.user.workers.dev"
                required
              />
            </div>
          </label>

          {/* Workers API Key Input */}
          <label className="grid gap-1.5 text-xs font-semibold text-zinc-400">
            <span>API Key</span>
            <div className="relative">
              <KeyIcon className="absolute left-3 top-3.5 size-4 text-zinc-600" />
              <input
                className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900/60 pl-9.5 pr-3 text-sm text-zinc-50 outline-none focus:border-amber-300/80 focus:bg-zinc-900/80 transition-all"
                value={form.apiKey}
                onChange={(event) => setForm({ ...form, apiKey: event.target.value })}
                placeholder="treat it like your browser history"
                type="password"
                required
              />
            </div>
          </label>

          {/* Custom Domain Input */}
          {form.workerBucketMode ? null : (
            <div className="grid gap-1.5">
              <label className="grid gap-1.5 text-xs font-semibold text-zinc-400">
                <span>Custom Domain</span>
                <div className="relative">
                  <GlobeIcon className="absolute left-3 top-3.5 size-4 text-zinc-600" />
                  <input
                    className="h-11 w-full rounded-xl border border-zinc-800 bg-zinc-900/60 pl-9.5 pr-3 text-sm text-zinc-50 outline-none focus:border-amber-300/80 focus:bg-zinc-900/80 transition-all"
                    value={form.customDomain}
                    onChange={(event) => setForm({ ...form, customDomain: event.target.value })}
                    placeholder="https://r2.example.com (optional)"
                  />
                </div>
              </label>
              <p className="text-[10px] leading-relaxed text-zinc-500">
                Recommended for caching and edge serving. Requires a custom domain connected to your R2 bucket.
              </p>
            </div>
          )}

          {/* Multi-bucket picker checkbox & logic */}
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
          
          <p className="text-[10px] leading-relaxed text-zinc-500">
            Check this if your Worker exposes multiple bound buckets. Pick the bucket from the generated bindings list.
          </p>

          {/* Save Button */}
          <button
            className="h-11 w-full rounded-xl bg-zinc-50 px-4 text-sm font-semibold text-zinc-950 hover:bg-amber-200 active:scale-98 transition-all cursor-pointer shadow-md shadow-white/5"
            type="submit"
          >
            Save To LocalStorage
          </button>
        </form>
      </aside>
    </main>
  );
}
