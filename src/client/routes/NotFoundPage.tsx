import { Link } from "@tanstack/react-router";

export function NotFoundPage() {
  return (
    <main className="flex min-h-[65vh] flex-col items-center justify-center rounded-3xl border border-zinc-800 bg-zinc-950/70 px-5 py-12 text-center">
      <div aria-hidden="true" className="mb-8 flex select-none flex-col items-center gap-6 font-mono text-xs leading-tight text-amber-300/80 sm:text-base">
        <pre className="text-left">{String.raw`  _  _      ___      _  _
 | || |    / _ \    | || |
 | || |_  | | | |   | || |_
 |__   _| | |_| |   |__   _|
    |_|    \___/       |_|`}</pre>
        <div className="flex flex-col items-center gap-2">
          <pre className="text-left">{String.raw`.------------.
 \          /
  \   ?    /
   '------'`}</pre>
          <span>bucket not found</span>
        </div>
      </div>
      <h1 className="font-display text-3xl font-bold tracking-tight text-zinc-50 sm:text-4xl">Page not found</h1>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-zinc-400">Looks like this page is missing. Head back to your endpoints or check the setup guide to find your way.</p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <Link to="/" className="rounded-xl bg-amber-300 px-5 py-2.5 text-sm font-semibold text-zinc-950 transition-colors hover:bg-amber-200">Back to endpoints</Link>
        <Link to="/setup-guide" className="rounded-xl border border-zinc-800 px-5 py-2.5 text-sm font-semibold text-zinc-400 transition-colors hover:border-amber-300/40 hover:text-amber-200">Setup guide</Link>
      </div>
    </main>
  );
}
