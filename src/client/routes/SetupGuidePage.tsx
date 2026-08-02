import { Link } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback, useMemo, type ReactNode } from "react";
import {
  CLOUDFLARE_DASHBOARD_URL,
  GITHUB_ISSUES_URL,
  GITHUB_REPO_URL,
  SETUP_GUIDE_IMAGES,
  WORKER_ALT_BINDING,
  WORKER_AUTH_SECRET_NAME,
  WORKER_BUNDLE_DOWNLOAD_URL,
  WORKER_BUNDLE_ENTRY,
  WORKER_BUNDLE_OUTDIR,
  WORKER_BUNDLE_RAW_URL,
  WORKER_DEFAULT_BINDING,
  WORKER_PRIVATE_LINK_SECRET_NAME,
  WORKER_RELEASE_ASSET,
  WORKER_RELEASE_TAG,
  WORKER_RELEASE_URL,
} from "../constants";
import { ArrowLeftIcon, ArrowUpIcon, CheckIcon, CopyIcon } from "../components/Icons";

// ─── Path types & section visibility ───────────────────────────────
type DeployPath = "recommended" | "alternate" | "full-control";

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "requirements", label: "Requirements" },
  { id: "choose-path", label: "Choose a path" },
  { id: "bucket", label: "R2 bucket" },
  { id: "worker-paste", label: "Worker via paste" },
  { id: "worker-cli", label: "Worker via CLI" },
  { id: "connect-ui", label: "Connect the UI" },
  { id: "custom-domain", label: "Custom domain" },
  { id: "bundle", label: "JS bundle" },
  { id: "fork", label: "Full fork" },
] as const;

/** Which sidebar sections are visible for each deploy path */
const PATH_VISIBLE_SECTIONS: Record<DeployPath, ReadonlySet<string>> = {
  recommended: new Set([
    "overview", "requirements", "choose-path", "bucket",
    "worker-paste", "connect-ui", "custom-domain", "bundle",
  ]),
  alternate: new Set([
    "overview", "requirements", "choose-path", "bucket",
    "worker-cli", "connect-ui", "custom-domain",
  ]),
  "full-control": new Set([
    "overview", "requirements", "choose-path", "bucket",
    "worker-cli", "connect-ui", "custom-domain", "fork",
  ]),
};

const PATH_META: { key: DeployPath; title: string; subtitle: string; description: string; icon: string }[] = [
  {
    key: "recommended",
    title: "Recommended",
    subtitle: "Paste Multy's Worker JS bundle",
    description:
      "No local toolchain needed. Create a Worker in the Cloudflare dashboard, paste Multy's prebuilt multi-bucket worker.js, attach R2 bindings + secrets, then add the Worker URL + API key in this UI.",
    icon: "⚡",
  },
  {
    key: "alternate",
    title: "Alternate",
    subtitle: "CLI deploy with Wrangler",
    description:
      "Clone the repo, bind buckets in wrangler.jsonc, set secrets, run pnpm deploy:worker. Best when you want config-as-code and easy upgrades.",
    icon: "⌨️",
  },
  {
    key: "full-control",
    title: "Full Control",
    subtitle: "Fork UI + Worker",
    description:
      "Fork the repo, deploy Pages and Worker under your account, customize branding and features. Use this when you want your own frontend, not only your own API.",
    icon: "🔧",
  },
];

// ─── Reusable primitives ───────────────────────────────────────────

function CodeBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
      {label ? (
        <div className="flex items-center justify-between border-b border-zinc-850 px-3.5 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-500">{label}</span>
          <button
            type="button"
            onClick={copy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 px-2 py-1 text-[10px] font-semibold text-zinc-400 hover:border-amber-300/40 hover:text-amber-200 transition-colors cursor-pointer"
          >
            {copied ? <CheckIcon className="size-3" /> : <CopyIcon className="size-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      ) : null}
      <pre className="overflow-x-auto p-3.5 text-[12px] leading-relaxed text-zinc-300 font-mono whitespace-pre-wrap">
        {code}
      </pre>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="grid gap-2 sm:grid-cols-[auto_1fr] sm:gap-4">
      <span className="mt-0.5 grid size-7 place-items-center rounded-xl border border-amber-300/30 bg-amber-300/10 text-[11px] font-bold text-amber-200">
        {n}
      </span>
      <div className="min-w-0">
        <h4 className="text-sm font-bold text-zinc-100 font-display">{title}</h4>
        <div className="mt-1.5 grid gap-2.5 text-sm leading-relaxed text-zinc-400">{children}</div>
      </div>
    </li>
  );
}

function Callout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-amber-300/20 bg-amber-300/5 p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200">{title}</p>
      <div className="mt-2 text-sm leading-relaxed text-zinc-300">{children}</div>
    </div>
  );
}

function GuideImage({ src, alt, caption }: { src: string; alt: string; caption?: string }) {
  return (
    <figure className="mt-1 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950">
      <img src={src} alt={alt} loading="lazy" className="block w-full h-auto" />
      {caption ? (
        <figcaption className="border-t border-zinc-850 px-3.5 py-2 text-[11px] leading-relaxed text-zinc-500">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
}

/** Inline code that sits flush with surrounding text */
function Code({ children }: { children: ReactNode }) {
  return <code className="text-amber-200/90 align-baseline">{children}</code>;
}

// ─── Main page component ──────────────────────────────────────────

export function SetupGuidePage() {
  const [activeSection, setActiveSection] = useState<string>(SECTIONS[0].id);
  const [selectedPath, setSelectedPath] = useState<DeployPath>("recommended");
  const observerRef = useRef<IntersectionObserver | null>(null);

  const visibleSections = useMemo(
    () => SECTIONS.filter((s) => PATH_VISIBLE_SECTIONS[selectedPath].has(s.id)),
    [selectedPath],
  );

  // --- Active section tracking via IntersectionObserver ---
  useEffect(() => {
    // Disconnect any previous observer before setting up a new one
    observerRef.current?.disconnect();

    const sectionEls = visibleSections
      .map((s) => document.getElementById(s.id))
      .filter(Boolean) as HTMLElement[];
    if (sectionEls.length === 0) return;

    // rootMargin: trigger when section header enters the top 20% of viewport
    observerRef.current = new IntersectionObserver(
      (entries) => {
        // Pick the topmost visible section
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActiveSection(visible[0].target.id);
        }
      },
      { rootMargin: "-80px 0px -65% 0px", threshold: 0 },
    );

    for (const el of sectionEls) observerRef.current.observe(el);
    return () => observerRef.current?.disconnect();
  }, [visibleSections]);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const isSectionVisible = useCallback(
    (id: string) => PATH_VISIBLE_SECTIONS[selectedPath].has(id),
    [selectedPath],
  );

  return (
    <>
    <main className="animate-fade-in-up">
      <div className="mb-5">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/30 px-3 py-1.5 text-xs font-semibold text-zinc-400 hover:border-amber-300/40 hover:text-amber-200 transition-colors"
        >
          <ArrowLeftIcon className="size-3.5" />
          Back to endpoints
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        {/* Sidebar – top offset accounts for sticky navbar height */}
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <div className="rounded-3xl border border-zinc-800/80 bg-zinc-950/70 p-4 shadow-2xl backdrop-blur-xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-zinc-500">On this page</p>
            <nav className="mt-3 grid gap-1">
              {visibleSections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className={`rounded-xl px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    activeSection === section.id
                      ? "bg-amber-300/10 text-amber-200 border border-amber-300/20"
                      : "text-zinc-400 hover:bg-zinc-900 hover:text-amber-200 border border-transparent"
                  }`}
                >
                  {section.label}
                </a>
              ))}
            </nav>
          </div>
        </aside>

        <article className="min-w-0 rounded-3xl border border-zinc-800/80 bg-zinc-950/70 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          <header className="relative overflow-hidden border-b border-zinc-850 pb-6">
            <div className="absolute left-0 top-0 -z-10 h-28 w-64 rounded-full bg-amber-500/5 blur-3xl" />
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-300">Setup guide</p>
            <h1 className="mt-3 max-w-2xl text-3xl font-extrabold tracking-tight text-zinc-50 sm:text-4xl font-display leading-[1.15]">
              Run Multy R2 on your Cloudflare account
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-zinc-400">
              Multy R2 splits the <strong className="text-zinc-200">shared UI</strong> (this Pages app) from{" "}
              <strong className="text-zinc-200">your Worker API</strong> (R2 bindings + secrets on your account).
              <br/>
              You keep the keys and buckets; the browser only stores endpoint records in localStorage.
            </p>
          </header>

          <div className="mt-8 grid gap-10">
            {/* ─── Overview ─────────────────────────────────── */}
            <section id="overview" className="scroll-mt-24 grid gap-3">
              <h2 className="text-xl font-bold text-zinc-50 font-display">How the pieces fit</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200">Client</p>
                  <p className="mt-2 text-sm font-semibold text-zinc-100">Cloudflare Pages SPA</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                    Hosted once (this site or your fork). Talks to any Multy-compatible Worker via endpoint URL + API key.
                  </p>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200">Server</p>
                  <p className="mt-2 text-sm font-semibold text-zinc-100">Your Worker</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                    Hono API only. Binds your R2 buckets, checks <Code>x-api-key</Code>,
                    serves <Code>/api/r2</Code> and public <Code>/cdn</Code> aliases.
                  </p>
                </div>
              </div>
            </section>

            {/* ─── Requirements ─────────────────────────────── */}
            <section id="requirements" className="scroll-mt-24 grid gap-3">
              <h2 className="text-xl font-bold text-zinc-50 font-display">Requirements</h2>
              <ul className="grid gap-2 text-sm text-zinc-400">
                <li className="flex gap-2"><span className="text-amber-300">•</span> Cloudflare account</li>
                <li className="flex gap-2"><span className="text-amber-300">•</span> R2 enabled (free tier is enough to start)</li>
                <li className="flex gap-2"><span className="text-amber-300">•</span> Workers enabled (free plan works)</li>
              </ul>
              {selectedPath !== "recommended" && (
                <div className="mt-1 rounded-2xl border border-amber-300/15 bg-amber-300/5 px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200">
                    Additional for {selectedPath === "alternate" ? "CLI deploy" : "full fork"}
                  </p>
                  <ul className="mt-2 grid gap-1.5 text-sm text-zinc-400">
                    <li className="flex gap-2"><span className="text-amber-300">•</span> <a className="text-amber-200 underline decoration-amber-300/30 hover:decoration-amber-300" href="https://nodejs.org/" target="_blank" rel="noreferrer">Node.js</a> 20+ and <a className="text-amber-200 underline decoration-amber-300/30 hover:decoration-amber-300" href="https://pnpm.io/" target="_blank" rel="noreferrer">pnpm</a></li>
                    <li className="flex gap-2"><span className="text-amber-300">•</span> Wrangler CLI — run <Code>npx wrangler login</Code> to authenticate</li>
                    <li className="flex gap-2"><span className="text-amber-300">•</span> Git (to clone or fork the repository)</li>
                  </ul>
                </div>
              )}
            </section>

            {/* ─── Choose a path ────────────────────────────── */}
            <section id="choose-path" className="scroll-mt-24 grid gap-3">
              <h2 className="text-xl font-bold text-zinc-50 font-display">Choose a path</h2>
              <p className="text-sm leading-relaxed text-zinc-400">
                Pick your deployment method — the guide will <strong className="text-zinc-200">adapt to show only the steps you need</strong>.
              </p>
              <div className="grid gap-3 sm:grid-cols-3">
                {PATH_META.map((path) => {
                  const isSelected = selectedPath === path.key;
                  return (
                    <button
                      key={path.key}
                      type="button"
                      onClick={() => setSelectedPath(path.key)}
                      className={`group relative cursor-pointer rounded-2xl border-2 p-4 text-left transition-all duration-200 ${
                        isSelected
                          ? "border-amber-300/60 bg-amber-300/10 shadow-[0_0_24px_-4px_rgba(251,191,36,0.15)]"
                          : "border-zinc-800 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-900/50"
                      }`}
                    >
                      {/* Selection indicator */}
                      <div className={`absolute right-3 top-3 grid size-5 place-items-center rounded-full border transition-all duration-200 ${
                        isSelected
                          ? "border-amber-300 bg-amber-300 text-zinc-950"
                          : "border-zinc-700 bg-zinc-900 text-transparent group-hover:border-zinc-600"
                      }`}>
                        <CheckIcon className="size-3" />
                      </div>

                      <span className="text-lg">{path.icon}</span>
                      <p className={`mt-2 text-sm font-bold ${isSelected ? "text-amber-200" : "text-zinc-100"}`}>
                        {path.title}
                      </p>
                      <p className={`text-xs font-medium ${isSelected ? "text-amber-200/70" : "text-zinc-500"}`}>
                        {path.subtitle}
                      </p>
                      <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                        {path.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* ─── 1. Create an R2 bucket ──────────────────── */}
            <section id="bucket" className="scroll-mt-24 grid gap-3">
              <h2 className="text-xl font-bold text-zinc-50 font-display">1. Create an R2 bucket</h2>
              <ol className="grid gap-5">
                <Step n={1} title="Open R2 in the dashboard">
                  <p>
                    Go to the{" "}
                    <a className="text-amber-200 underline decoration-amber-300/30 hover:decoration-amber-300" href={CLOUDFLARE_DASHBOARD_URL} target="_blank" rel="noreferrer">
                      Cloudflare Dashboard
                    </a>
                    . In the left sidebar open <strong className="text-zinc-200">Storage &amp; databases</strong> →{" "}
                    <strong className="text-zinc-200">R2 Object Storage</strong> (you can also create D1 from that same menu later).
                  </p>
                  <GuideImage
                    src={SETUP_GUIDE_IMAGES.workerBindings}
                    alt="Cloudflare sidebar showing Storage and databases with R2 Object Storage and D1"
                    caption="Create R2 buckets (and optional D1) under Storage & databases. Bind them to the Worker in a later step."
                  />
                </Step>
                <Step n={2} title="Create a bucket">
                  <p>Click <strong className="text-zinc-200">Create bucket</strong>, pick a name (e.g. <Code>my-assets</Code>), create it. Repeat for each bucket you want Multy to manage.</p>
                </Step>
              </ol>
            </section>

            {/* ─── 2. Worker via paste (recommended) ───────── */}
            {isSectionVisible("worker-paste") && (
            <section id="worker-paste" className="scroll-mt-24 grid gap-3">
              <h2 className="text-xl font-bold text-zinc-50 font-display">2. Paste Multy&apos;s Worker bundle (recommended)</h2>
              <p className="text-sm leading-relaxed text-zinc-400">
                Fastest path for most users — dashboard only, no Node/pnpm required. The paste target is{" "}
                <strong className="text-zinc-200">Multy&apos;s multi-bucket Worker</strong> (same runtime as a CLI deploy).
                You still must attach bindings and secrets in the dashboard — the JS file alone is not enough.
              </p>
              <ol className="grid gap-5">
                <Step n={1} title="Get Multy's Worker bundle">
                  <p>
                    Get the prebuilt multi-bucket Worker from the rolling{" "}
                    <a className="text-amber-200 underline decoration-amber-300/30 hover:decoration-amber-300" href={WORKER_RELEASE_URL} target="_blank" rel="noreferrer">
                      <Code>{WORKER_RELEASE_TAG}</Code> GitHub Release
                    </a>
                    . Every push to <code className="text-zinc-300">main</code> rebuilds and updates this asset.
                  </p>
                  <p>
                    <a
                      className="inline-flex items-center gap-2 rounded-xl bg-amber-300 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-200 transition-colors"
                      href={WORKER_BUNDLE_RAW_URL}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open {WORKER_RELEASE_ASSET}
                    </a>
                  </p>
                  <p className="text-xs text-zinc-500">
                    Opens the JS inline on GitHub (raw) — select all, copy, paste into the Worker editor.
                  </p>
                  <p className="text-xs text-zinc-500">
                    Raw:{" "}
                    <a className="break-all text-amber-200/80 underline decoration-amber-300/20 hover:decoration-amber-300" href={WORKER_BUNDLE_RAW_URL} target="_blank" rel="noreferrer">
                      {WORKER_BUNDLE_RAW_URL}
                    </a>
                  </p>
                  <p className="text-xs text-zinc-500">
                    Download instead:{" "}
                    <a className="break-all text-amber-200/80 underline decoration-amber-300/20 hover:decoration-amber-300" href={WORKER_BUNDLE_DOWNLOAD_URL} target="_blank" rel="noreferrer">
                      {WORKER_BUNDLE_DOWNLOAD_URL}
                    </a>
                  </p>
                  <p>
                    Optional local build: <Code>pnpm build:worker-bundle</Code>{" → "}
                    <Code>{WORKER_BUNDLE_OUTDIR}/{WORKER_BUNDLE_ENTRY}</Code>.
                    Paste either file into the Worker editor.
                  </p>
                  <p className="text-xs text-zinc-500">
                    Local note: <Code>pnpm gen:bindings</Code> bakes friendly bucket labels from <em>your</em>{" "}
                    <Code>wrangler.jsonc</Code> into the bundle. Runtime still resolves whatever R2 bindings you attach;
                    only the display names in multi-bucket mode may show Multy&apos;s (or your local) bucket names.
                  </p>
                </Step>
                <Step n={2} title="Create a Worker (Hello World stub)">
                  <p>
                    Left sidebar: <strong className="text-zinc-200">Compute</strong> →{" "}
                    <strong className="text-zinc-200">Workers &amp; Pages</strong> → Create. 
                  </p>
                  <GuideImage
                    src={SETUP_GUIDE_IMAGES.workersNav}
                    alt="Cloudflare dashboard sidebar with Compute and Workers and Pages highlighted"
                    caption="Open Compute → Workers & Pages."
                  />
                  <p>
                    <strong className="text-zinc-200">Start with Hello World!</strong> — you will replace this stub with Multy's bundle next.
                  </p>
                  <GuideImage
                    src={SETUP_GUIDE_IMAGES.createWorkerHello}
                    alt="Create a Worker dialog with Start with Hello World highlighted"
                    caption="Select Start with Hello World! — you will replace this stub with Multy's bundle next."
                  />
                  <p>
                    Name the Worker (Cloudflare suggests a URL; you can edit it), then click{" "}
                    <strong className="text-zinc-200">Deploy</strong>.
                  </p>
                  <GuideImage
                    src={SETUP_GUIDE_IMAGES.createWorkerName}
                    alt="Deploy Hello World dialog with worker name field"
                    caption="Optional: edit the workers.dev name, then Deploy."
                  />
                </Step>
                <Step n={3} title="Paste Multy's bundle in the editor">
                  <p>
                    Open the Worker (under Workers & Pages) → <strong className="text-zinc-200">Edit code</strong>. 
                    <br/>
                    Select all of the content, replace it with copied code from{" "}
                    <Code>{WORKER_RELEASE_ASSET}</Code>, then click{" "}
                    <strong className="text-zinc-200">Deploy</strong> (top right).
                  </p>
                  <GuideImage
                    src={SETUP_GUIDE_IMAGES.workerEditorPaste}
                    alt="Cloudflare Worker code editor with Deploy button highlighted"
                    caption="Replace the Hello World script with Multy's downloaded JS, then Deploy."
                  />
                  <p>
                    After deploy, opening the Worker URL should show{" "}
                    <Code>Multy R2 endpoint worker</Code> (not Hello World).
                  </p>
                </Step>
                <Step n={4} title="Add secrets (type must be Secret)">
                  <p>
                    Leave the editor and open <strong className="text-zinc-200">Settings</strong> → Variables and secrets →{" "}
                    <strong className="text-zinc-200">+ Add</strong>. Create both:
                  </p>
                  <ul className="grid gap-1.5 text-xs text-zinc-400">
                    <li><Code>{WORKER_AUTH_SECRET_NAME}</Code> — API key Multy sends as <code className="text-zinc-300">x-api-key</code></li>
                    <li><Code>{WORKER_PRIVATE_LINK_SECRET_NAME}</Code> — used for signed private links</li>
                  </ul>
                  <p>
                    Use a strong, random value for each key. You can generate one with{" "}
                    <a className="text-amber-200 underline decoration-amber-300/30 hover:decoration-amber-300" href="https://www.avast.com/en-in/random-password-generator" target="_blank" rel="noreferrer">
                      Avast&apos;s Password Generator
                    </a>
                    {" "}(16+ characters recommended).
                  </p>
                  <Callout title="Save your API key">
                    Copy and store the <Code>{WORKER_AUTH_SECRET_NAME}</Code> value somewhere safe (e.g. a password manager or notepad) —{" "}
                    <strong className="text-zinc-50">you will need it later</strong> when connecting this UI to your Worker.
                    Cloudflare will not let you view Secret values after saving.
                  </Callout>
                  <Callout title="Use Secret, not Plaintext">
                    For <strong className="text-zinc-50">both</strong> keys, set the Cloudflare type to{" "}
                    <strong className="text-zinc-50">Secret</strong> (encrypted). Do not leave them as Plaintext —
                    Plaintext values are visible in the dashboard and in config exports.
                  </Callout>
                  <GuideImage
                    src={SETUP_GUIDE_IMAGES.workerSecrets}
                    alt="Worker Settings Variables and secrets with Add button highlighted"
                    caption="Settings → Variables and secrets → + Add. Both AUTH_KEY_SECRET and PRIVATE_LINK_SECRET must be type Secret."
                  />
                </Step>
                <Step n={5} title="Attach R2 bindings (and D1 if needed)">
                  <p>
                    Open <strong className="text-zinc-200">Bindings</strong> (or Overview → Bindings → Add a binding) and connect each R2 bucket.
                    For the default bucket path, use variable name{" "}
                    <Code>{WORKER_DEFAULT_BINDING}</Code> or{" "}
                    <Code>{WORKER_ALT_BINDING}</Code>. Add more bindings with any valid name
                    for multi-bucket mode in the UI. Attach D1 as{" "}
                    <Code>DB</Code> if you use control-plane routes.
                  </p>
                  <GuideImage
                    src={SETUP_GUIDE_IMAGES.workerOverview}
                    alt="Worker overview showing Bindings panel with R2 buckets and D1"
                    caption="Overview Bindings panel — add R2 bucket bindings from here."
                  />
                  <GuideImage
                    src={SETUP_GUIDE_IMAGES.workerBindings}
                    alt="Worker Bindings page listing R2 buckets and D1 database"
                    caption="Bindings tab: each R2 row is variable name → real bucket. Create buckets under Storage & databases first, then bind them here."
                  />
                </Step>
                <Step n={6} title="Confirm the Worker is live">
                  <p>
                    Open the Worker URL again — you should still see{" "}
                    <Code>Multy R2 endpoint worker</Code>. Save that URL; 
                    <br />
                    you will paste it into Multy next.
                  </p>
                </Step>
              </ol>
            </section>
            )}

            {/* ─── 2b. Deploy with Wrangler (alternate / full-control) ── */}
            {isSectionVisible("worker-cli") && (
            <section id="worker-cli" className="scroll-mt-24 grid gap-3">
              <h2 className="text-xl font-bold text-zinc-50 font-display">2. Deploy with Wrangler (CLI)</h2>
              <p className="text-sm leading-relaxed text-zinc-400">
                Use this when you want config-as-code, repeatable deploys, or D1 migrations from the CLI.
                Wrangler bundles the same multi-bucket Worker TypeScript source.
              </p>
              <ol className="grid gap-5">
                <Step n={1} title="Clone and install">
                  <CodeBlock
                    label="shell"
                    code={`git clone ${GITHUB_REPO_URL}.git\ncd multy-r2\npnpm install`}
                  />
                </Step>
                <Step n={2} title="Point wrangler.jsonc at your buckets">
                  <p>
                    Edit <Code>r2_buckets</Code>. The <strong className="text-zinc-200">binding</strong> name
                    (e.g. <Code>{WORKER_DEFAULT_BINDING}</Code> or{" "}
                    <Code>{WORKER_ALT_BINDING}</Code>) is what URLs and the UI use.
                    The <strong className="text-zinc-200">bucket_name</strong> is the real R2 bucket.
                  </p>
                  <CodeBlock
                    label="wrangler.jsonc (excerpt)"
                    code={`"r2_buckets": [\n  {\n    "binding": "${WORKER_DEFAULT_BINDING}",\n    "bucket_name": "my-assets"\n  }\n]`}
                  />
                  <p className="text-xs text-zinc-500">
                    Multi-bucket: add more bindings. Default scope uses the first of{" "}
                    <code className="text-zinc-400">{WORKER_DEFAULT_BINDING}</code> /{" "}
                    <code className="text-zinc-400">{WORKER_ALT_BINDING}</code>.
                  </p>
                </Step>
                <Step n={3} title="Create D1 (if you use admin features)">
                  <p>
                    The Worker expects a D1 binding named <Code>DB</Code>. Create a database, put its id in{" "}
                    <Code>wrangler.jsonc</Code>, then apply migrations:
                  </p>
                  <CodeBlock label="shell" code={`pnpm migrate:deploy`} />
                </Step>
                <Step n={4} title="Set secrets">
                  <CodeBlock
                    label="shell"
                    code={`npx wrangler secret put ${WORKER_AUTH_SECRET_NAME}\nnpx wrangler secret put ${WORKER_PRIVATE_LINK_SECRET_NAME}`}
                  />
                  <p>
                    <Code>wrangler secret put</Code> stores both as encrypted Secrets (not plaintext).
                    <Code>{WORKER_AUTH_SECRET_NAME}</Code> is the API key you paste into Multy R2.
                  </p>
                </Step>
                <Step n={5} title="Deploy">
                  <CodeBlock label="shell" code={`pnpm deploy:worker`} />
                  <p>
                    Copy the Worker URL (e.g. <Code>https://multy-r2.&lt;you&gt;.workers.dev</Code>).
                    Open it in a browser — you should see the health text <Code>Multy R2 endpoint worker</Code>.
                  </p>
                </Step>
              </ol>
            </section>
            )}

            {/* ─── 3. Connect Multy R2 ─────────────────────── */}
            <section id="connect-ui" className="scroll-mt-24 grid gap-3">
              <h2 className="text-xl font-bold text-zinc-50 font-display">3. Connect Multy R2</h2>
              <ol className="grid gap-5">
                <Step n={1} title="Open the endpoint form">
                  <p>
                    On the{" "}
                    <Link to="/" className="text-amber-200 underline decoration-amber-300/30 hover:decoration-amber-300">
                      home page
                    </Link>
                    , fill in the New Endpoint panel:
                  </p>
                  <ul className="mt-1 grid gap-1.5 text-xs text-zinc-400">
                    <li><strong className="text-zinc-200">Workers Endpoint</strong> — your Worker URL (no trailing path)</li>
                    <li><strong className="text-zinc-200">API Key</strong> — same value as <code className="text-zinc-300">{WORKER_AUTH_SECRET_NAME}</code></li>
                    <li>
                      <strong className="text-zinc-200">Custom Domain</strong> — optional; the R2 custom domain (or subdomain)
                      connected to <em>that</em> bucket for public CDN URLs
                    </li>
                  </ul>
                  <GuideImage
                    src={SETUP_GUIDE_IMAGES.multyEndpoint}
                    alt="Multy New Endpoint form with Workers Endpoint, API Key, and Custom Domain fields"
                    caption="Endpoint = Worker URL. API Key = AUTH_KEY_SECRET. Custom Domain = the per-bucket R2 custom domain (optional)."
                  />
                </Step>
                <Step n={2} title="Optional multi-bucket mode">
                  <p>
                    If the Worker exposes several R2 bindings, enable multi-bucket mode. The UI calls{" "}
                    <Code>GET /api/r2/bindings</Code> with your API key and lets you pick a binding.
                    Each binding can have its own R2 custom domain entered in Multy (one domain per bucket).
                  </p>
                </Step>
                <Step n={3} title="Save and open">
                  <p>
                    Save to localStorage, then open the endpoint card. Upload, list, delete, and copy public URLs all go through{" "}
                    <strong className="text-zinc-200">your</strong> Worker — credentials never leave the browser except as{" "}
                    <Code>x-api-key</Code> to that host.
                  </p>
                </Step>
              </ol>
            </section>

            {/* ─── 4. Custom domain ────────────────────────── */}
            <section id="custom-domain" className="scroll-mt-24 grid gap-3">
              <h2 className="text-xl font-bold text-zinc-50 font-display">4. Custom domain (optional)</h2>
              <Callout title="R2 custom domains are per bucket">
                A custom domain connected to R2 is <strong className="text-zinc-100">one domain (or subdomain) per bucket</strong>.
                Example: <code className="text-zinc-300">cdn.example.com</code> → bucket A,{" "}
                <code className="text-zinc-300">assets.example.com</code> → bucket B.
                You cannot point one R2 custom domain at multiple buckets. In Multy, put each bucket&apos;s domain in that
                endpoint/binding&apos;s Custom Domain field so copy-links match the right CDN host.
              </Callout>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4">
                  <p className="text-sm font-bold text-zinc-100">On the Worker</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                    Workers → your worker → Domains &amp; Routes → Custom Domain.
                    Put that URL in the Multy <strong className="text-zinc-200">Endpoint</strong> field.
                    Simplest way to avoid <code className="text-zinc-300">workers.dev</code> limits/blocks.
                  </p>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4">
                  <p className="text-sm font-bold text-zinc-100">On the R2 bucket (CDN)</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                    R2 → open <strong className="text-zinc-200">that specific bucket</strong> → Settings → Custom Domains → + Add.
                    Put that host in Multy <strong className="text-zinc-200">Custom Domain</strong> (not Endpoint).
                    Public copy-links then use the CDN host while API traffic still hits the Worker.
                  </p>
                </div>
              </div>
              <GuideImage
                src={SETUP_GUIDE_IMAGES.r2CustomDomain}
                alt="R2 bucket Settings Custom Domains section with Add button"
                caption="Per bucket: R2 → bucket → Settings → Custom Domains → + Add. Repeat for every bucket that needs its own CDN hostname."
              />
              <p className="text-xs leading-relaxed text-zinc-500">
                Public reads also work via the Worker at <code className="text-zinc-400">/cdn/&lt;key&gt;</code> (default bucket)
                or <code className="text-zinc-400">/cdn/&lt;binding&gt;/&lt;key&gt;</code> (multi-bucket). Writes stay on{" "}
                <code className="text-zinc-400">/api/r2</code>.
              </p>
            </section>

            {/* ─── JS bundle info (recommended only) ───────── */}
            {isSectionVisible("bundle") && (
            <section id="bundle" className="scroll-mt-24 grid gap-3">
              <h2 className="text-xl font-bold text-zinc-50 font-display">How Multy ships the Worker JS bundle</h2>
              <p className="text-sm leading-relaxed text-zinc-400">
                Multy is TypeScript + Hono. There is no hand-written single file in the repo root — Wrangler produces the final multi-bucket bundle.
                That file is what end users paste.
              </p>
              <div className="grid gap-3">
                <div className="rounded-2xl border border-amber-300/40 bg-amber-300/10 p-4">
                  <p className="text-sm font-bold text-zinc-50">GitHub Release (auto on main)</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                    CI workflow <code className="text-zinc-300">release-worker-bundle.yml</code> runs on each push to{" "}
                    <code className="text-zinc-300">main</code>, builds the multi-bucket Worker, and updates the rolling{" "}
                    <code className="text-zinc-300">{WORKER_RELEASE_TAG}</code> release asset{" "}
                    <code className="text-zinc-300">{WORKER_RELEASE_ASSET}</code>. Users download and paste — no clone required.
                  </p>
                  <p className="mt-2 text-xs">
                    Inline:{" "}
                    <a className="break-all text-amber-200 underline decoration-amber-300/30 hover:decoration-amber-300" href={WORKER_BUNDLE_RAW_URL} target="_blank" rel="noreferrer">
                      {WORKER_BUNDLE_RAW_URL}
                    </a>
                  </p>
                  <p className="mt-1 text-xs">
                    Download:{" "}
                    <a className="break-all text-amber-200 underline decoration-amber-300/30 hover:decoration-amber-300" href={WORKER_BUNDLE_DOWNLOAD_URL} target="_blank" rel="noreferrer">
                      {WORKER_BUNDLE_DOWNLOAD_URL}
                    </a>
                  </p>
                  <CodeBlock
                    label="local equivalent"
                    code={`pnpm build:worker-bundle\n# → ${WORKER_BUNDLE_OUTDIR}/${WORKER_BUNDLE_ENTRY}\n# CI renames to ${WORKER_RELEASE_ASSET} on the ${WORKER_RELEASE_TAG} release`}
                  />
                  <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                    Heads-up for local builds: friendly multi-bucket labels come from{" "}
                    <Code>src/server/generated/bucketNames.ts</Code> (generated from your{" "}
                    <Code>wrangler.jsonc</Code>). Binding discovery at runtime is dynamic — wrong labels are cosmetic only.
                  </p>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4">
                  <p className="text-sm font-bold text-zinc-100">2. CLI deploy for maintainers / power users</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                    Clone/fork, edit bindings, set secrets, run <code className="text-zinc-300">pnpm deploy:worker</code>.
                    Same Worker code; better for config-as-code and upgrades via <code className="text-zinc-300">git pull</code>.
                  </p>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4">
                  <p className="text-sm font-bold text-zinc-100">3. Do not treat the Pages UI bundle as the Worker</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                    The Vite <code className="text-zinc-300">dist/</code> output is the SPA only. It cannot bind R2.
                    Users who want their own UI deploy Pages separately (<code className="text-zinc-300">pnpm deploy:pages</code>)
                    and still need a Worker for storage.
                  </p>
                </div>
              </div>
            </section>
            )}

            {/* ─── Full fork (full-control only) ───────────── */}
            {isSectionVisible("fork") && (
            <section id="fork" className="scroll-mt-24 grid gap-3">
              <h2 className="text-xl font-bold text-zinc-50 font-display">5. Full fork: your UI and backend</h2>
              <ol className="grid gap-5">
                <Step n={1} title="Fork the repository">
                  <p>
                    Fork{" "}
                    <a className="text-amber-200 underline decoration-amber-300/30" href={GITHUB_REPO_URL} target="_blank" rel="noreferrer">
                      {GITHUB_REPO_URL.replace("https://", "")}
                    </a>
                    .
                  </p>
                </Step>
                <Step n={2} title="Deploy Worker">
                  <CodeBlock label="shell" code={`pnpm deploy:worker`} />
                </Step>
                <Step n={3} title="Deploy Pages (your UI)">
                  <CodeBlock label="shell" code={`pnpm deploy:pages`} />
                  <p className="text-xs text-zinc-500">
                    Or connect the fork in Cloudflare Pages: build <code className="text-zinc-400">pnpm build:client</code>, output{" "}
                    <code className="text-zinc-400">dist</code>.
                  </p>
                </Step>
                <Step n={4} title="Point your UI at your Worker">
                  <p>Open your Pages URL, add the Worker endpoint + API key. You now own both sides end-to-end.</p>
                </Step>
              </ol>
            </section>
            )}

            {/* ─── Footer ──────────────────────────────────── */}
            <section className="border-t border-zinc-850 pt-6 grid gap-2">
              <p className="text-sm text-zinc-400">
                Stuck? Open an issue on{" "}
                <a className="text-amber-200 underline decoration-amber-300/30" href={GITHUB_ISSUES_URL} target="_blank" rel="noreferrer">
                  GitHub
                </a>
                . API reference lives in the repo at <code className="text-zinc-300">docs/api.md</code>.
              </p>
              <Link
                to="/"
                className="mt-2 inline-flex w-fit items-center gap-2 rounded-xl bg-amber-300 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-200 transition-colors"
              >
                Add an endpoint
              </Link>
            </section>
          </div>
        </article>
      </div>
    </main>

      {/* Outside animated main — transform on ancestors breaks position:fixed */}
      <button
        type="button"
        onClick={scrollToTop}
        aria-label="Scroll to top"
        className="fixed bottom-6 right-6 z-50 grid size-10 cursor-pointer place-items-center rounded-2xl border border-amber-300/30 bg-zinc-950/80 text-amber-200 shadow-lg shadow-amber-300/10 backdrop-blur-xl transition-all duration-300 hover:scale-110 hover:border-amber-300/60 hover:bg-amber-300/10"
      >
        <ArrowUpIcon className="size-5" />
      </button>
    </>
  );
}
