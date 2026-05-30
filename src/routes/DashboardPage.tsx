import { Link } from "@tanstack/react-router";
import { FormEvent, useState } from "react";
import { deleteEndpointRecord, listEndpointRecords, saveEndpointRecord } from "../api";
import type { EndpointRecord } from "../shared";

const EMPTY_FORM = {
  endPoint: "",
  apiKey: "",
  customDomain: "",
};

export function DashboardPage() {
  const [records, setRecords] = useState<EndpointRecord[]>(() => listEndpointRecords());
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);

  function submitBucket(event: FormEvent<HTMLFormElement>) {
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
    <main className="grid gap-4 lg:grid-cols-[1fr_380px]">
      <section className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-6 shadow-2xl lg:col-span-2">
        <div className="text-xs uppercase tracking-[0.22em] text-amber-300">R2 endpoint admin</div>
        <h1 className="mt-3 max-w-3xl text-4xl font-semibold tracking-tight text-zinc-50 sm:text-5xl">
          Manage saved R2 Worker endpoints.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
          Like r2-uploader, each endpoint stores its Worker URL, API key, and optional custom domain in localStorage.
          The key is sent as <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-200">x-api-key</code> only when that endpoint is used.
        </p>
      </section>

      <section className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5 shadow-2xl">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">LocalStorage</p>
            <h2 className="mt-1 text-2xl font-semibold text-zinc-50">Endpoints</h2>
          </div>
          <button className="rounded-xl border border-zinc-700 px-3 py-2 text-sm text-zinc-300 hover:border-amber-300" onClick={() => setRecords(listEndpointRecords())} type="button">
            Refresh
          </button>
        </div>

        {error ? <div className="mt-4 rounded-2xl border border-red-900/60 bg-red-950/40 p-3 text-sm text-red-200">{error}</div> : null}

        {records.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 text-sm text-zinc-400">
            <strong className="block text-zinc-100">No endpoints yet.</strong>
            Add your r2-uploader-style Worker endpoint and API key.
          </div>
        ) : null}

        <div className="mt-4 grid gap-3">
          {records.map((record) => (
            <div key={record.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
              <Link to="/buckets/$bucketId" params={{ bucketId: record.id }} className="block">
                <h3 className="truncate text-base font-semibold text-zinc-50">{record.customDomain || record.endPoint}</h3>
                <p className="mt-1 truncate text-sm text-zinc-500">{record.endPoint}</p>
              </Link>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-2.5 py-1 text-xs text-amber-200">endpoint</span>
                <button className="rounded-full border border-red-900/70 px-2.5 py-1 text-xs text-red-300 hover:bg-red-950/40" type="button" onClick={() => removeRecord(record.id)}>
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <aside className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-5 shadow-2xl lg:sticky lg:top-4 lg:self-start">
        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Add a new endpoint</p>
        <h2 className="mt-1 text-2xl font-semibold text-zinc-50">Worker endpoint</h2>
        <form className="mt-4 grid gap-4" onSubmit={submitBucket}>
          <label className="grid gap-2 text-sm font-medium text-zinc-300">
            Workers Endpoint
            <input className="h-11 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-50 outline-none focus:border-amber-300" value={form.endPoint} onChange={(event) => setForm({ ...form, endPoint: event.target.value })} placeholder="https://bucket.user.workers.dev" required />
          </label>
          <label className="grid gap-2 text-sm font-medium text-zinc-300">
            Workers Endpoint API Key
            <input
              className="h-11 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-50 outline-none focus:border-amber-300"
              value={form.apiKey}
              onChange={(event) => setForm({ ...form, apiKey: event.target.value })}
              placeholder="treat it like your browser history"
              type="password"
              required
            />
          </label>
          <label className="grid gap-2 text-sm font-medium text-zinc-300">
            Custom Domain (Optional)
            <input
              className="h-11 rounded-xl border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-50 outline-none focus:border-amber-300"
              value={form.customDomain}
              onChange={(event) => setForm({ ...form, customDomain: event.target.value })}
              placeholder="https://r2.example.com"
            />
          </label>
          <p className="text-sm leading-6 text-zinc-500">
            No Worker binding is needed for this endpoint mode. The endpoint Worker already knows its bucket.
          </p>
          <button className="h-11 rounded-xl bg-zinc-50 px-4 text-sm font-semibold text-zinc-950 hover:bg-amber-200" type="submit">
            Save To LocalStorage
          </button>
        </form>
      </aside>
    </main>
  );
}
