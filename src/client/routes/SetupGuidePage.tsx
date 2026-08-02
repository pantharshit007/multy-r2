import { Link } from "@tanstack/react-router";
import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";
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
  WORKER_DEFAULT_BINDING,
  WORKER_PRIVATE_LINK_SECRET_NAME,
  WORKER_RELEASE_ASSET,
  WORKER_RELEASE_TAG,
  WORKER_RELEASE_URL,
} from "../constants";
import { ArrowLeftIcon, ArrowUpIcon, CheckIcon, CopyIcon } from "../components/Icons";

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

export function SetupGuidePage() {
  const [activeSection, setActiveSection] = useState<string>(SECTIONS[0].id);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // --- Active section tracking via IntersectionObserver ---
  useEffect(() => {
    // Disconnect any previous observer before setting up a new one
    observerRef.current?.disconnect();

    const sectionEls = SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
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
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

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
              {SECTIONS.map((section) => (
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
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
              Multy R2 splits the <strong className="text-zinc-200">shared UI</strong> (this Pages app) from{" "}
              <strong className="text-zinc-200">your Worker API</strong> (R2 bindings + secrets on your account).
              You keep the keys and buckets; the browser only stores endpoint records in localStorage.
            </p>
          </header>

          <div className="mt-8 grid gap-10">
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
                    Hono API only. Binds your R2 buckets, checks <code className="text-amber-200/90">x-api-key</code>,
                    serves <code className="text-amber-200/90">/api/r2</code> and public <code className="text-amber-200/90">/cdn</code> aliases.
                  </p>
                </div>
              </div>
            </section>

            <section id="requirements" className="scroll-mt-24 grid gap-3">
              <h2 className="text-xl font-bold text-zinc-50 font-display">Requirements</h2>
              <ul className="grid gap-2 text-sm text-zinc-400">
                <li className="flex gap-2"><span className="text-amber-300">•</span> Cloudflare account</li>
                <li className="flex gap-2"><span className="text-amber-300">•</span> R2 enabled (free tier is enough to start)</li>
                <li className="flex gap-2"><span className="text-amber-300">•</span> Workers (free plan works)</li>
                <li className="flex gap-2"><span className="text-amber-300">•</span> For CLI deploy: Node.js 20+, pnpm, and Wrangler login</li>
              </ul>
            </section>

            <section id="choose-path" className="scroll-mt-24 grid gap-3">
              <h2 className="text-xl font-bold text-zinc-50 font-display">Choose a path</h2>
              <div className="grid gap-3">
                <div className="rounded-2xl border border-amber-300/40 bg-amber-300/10 p-4">
                  <p className="text-sm font-bold text-zinc-50">Recommended — paste Multy&apos;s Worker JS bundle</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                    No local toolchain. Create a Worker in the Cloudflare dashboard, paste Multy&apos;s prebuilt multi-bucket{" "}
                    <code className="text-zinc-300">{WORKER_RELEASE_ASSET}</code>, attach R2 bindings + secrets, then add the
                    Worker URL + API key in this UI.
                  </p>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4">
                  <p className="text-sm font-bold text-zinc-100">Alternative — CLI deploy with Wrangler</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                    Clone the repo, bind buckets in <code className="text-zinc-300">wrangler.jsonc</code>, set secrets, run{" "}
                    <code className="text-zinc-300">pnpm deploy:worker</code>. Best when you want config-as-code and easy upgrades.
                  </p>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4">
                  <p className="text-sm font-bold text-zinc-100">Full control — fork UI + Worker</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                    Fork the repo, deploy Pages and Worker under your account, customize branding and features.
                    Use this when you want your own frontend, not only your own API.
                  </p>
                </div>
              </div>
            </section>

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
                  <p>Click <strong className="text-zinc-200">Create bucket</strong>, pick a name (e.g. <code className="text-amber-200/90">my-assets</code>), create it. Repeat for each bucket you want Multy to manage.</p>
                </Step>
              </ol>
            </section>

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
                    Copy the prebuilt multi-bucket Worker from the rolling{" "}
                    <a className="text-amber-200 underline decoration-amber-300/30 hover:decoration-amber-300" href={WORKER_RELEASE_URL} target="_blank" rel="noreferrer">
                      <code className="text-amber-200/90">{WORKER_RELEASE_TAG}</code> GitHub Release
                    </a>
                    . Every push to <code className="text-zinc-300">main</code> rebuilds and updates this asset.
                  </p>
                  <p>
                    <a
                      className="inline-flex items-center gap-2 rounded-xl bg-amber-300 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:bg-amber-200 transition-colors"
                      href={WORKER_BUNDLE_DOWNLOAD_URL}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Copy {WORKER_RELEASE_ASSET}
                    </a>
                  </p>
                  <p className="text-xs text-zinc-500">
                    Direct URL:{" "}
                    <a className="break-all text-amber-200/80 underline decoration-amber-300/20 hover:decoration-amber-300" href={WORKER_BUNDLE_DOWNLOAD_URL} target="_blank" rel="noreferrer">
                      {WORKER_BUNDLE_DOWNLOAD_URL}
                    </a>
                  </p>
                  <p>
                    Optional local build: <code className="text-amber-200/90"> pnpm build:worker-bundle</code> →{" "}
                    <code className="text-amber-200/90">{WORKER_BUNDLE_OUTDIR}/{WORKER_BUNDLE_ENTRY}</code>.
                    Paste either file into the Worker editor 
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
                    <code className="text-amber-200/90">{WORKER_RELEASE_ASSET}</code>, then click{" "}
                    <strong className="text-zinc-200">Deploy</strong> (top right).
                  </p>
                  <GuideImage
                    src={SETUP_GUIDE_IMAGES.workerEditorPaste}
                    alt="Cloudflare Worker code editor with Deploy button highlighted"
                    caption="Replace the Hello World script with Multy's downloaded JS, then Deploy."
                  />
                  <p>
                    After deploy, opening the Worker URL should show{" "}
                    <code className="text-amber-200/90">Multy R2 endpoint worker</code> (not Hello World).
                  </p>
                </Step>
                <Step n={4} title="Add secrets (type must be Secret)">
                  <p>
                    Leave the editor and open <strong className="text-zinc-200">Settings</strong> → Variables and secrets →{" "}
                    <strong className="text-zinc-200">+ Add</strong>. Create both:
                  </p>
                  <ul className="grid gap-1.5 text-xs text-zinc-400">
                    <li><code className="text-amber-200/90">{WORKER_AUTH_SECRET_NAME}</code> — API key Multy sends as <code className="text-zinc-300">x-api-key</code></li>
                    <li><code className="text-amber-200/90">{WORKER_PRIVATE_LINK_SECRET_NAME}</code> — used for signed private links</li>
                  </ul>
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
                    <code className="text-amber-200/90">{WORKER_DEFAULT_BINDING}</code> or{" "}
                    <code className="text-amber-200/90">{WORKER_ALT_BINDING}</code>. Add more bindings with any valid name
                    for multi-bucket mode in the UI. Attach D1 as{" "}
                    <code className="text-amber-200/90">DB</code> if you use control-plane routes.
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
                    <code className="text-amber-200/90">Multy R2 endpoint worker</code>. Save that URL; you will paste it into Multy next.
                  </p>
                </Step>
              </ol>
            </section>

            <section id="worker-cli" className="scroll-mt-24 grid gap-3">
              <h2 className="text-xl font-bold text-zinc-50 font-display">2b. Deploy with Wrangler (optional)</h2>
              <p className="text-sm leading-relaxed text-zinc-400">
                Use this when you want config-as-code, repeatable deploys, or D1 migrations from the CLI.
                Wrangler bundles the same multi-bucket Worker TypeScript source.
              </p>
              <ol className="grid gap-5">
                <Step n={1} title="Clone and install">
                  <CodeBlock
                    label="shell"
                    code={`git clone ${GITHUB_REPO_URL}.git
cd multy-r2
pnpm install`}
                  />
                </Step>
                <Step n={2} title="Point wrangler.jsonc at your buckets">
                  <p>
                    Edit <code className="text-amber-200/90">r2_buckets</code>. The <strong className="text-zinc-200">binding</strong> name
                    (e.g. <code className="text-amber-200/90">{WORKER_DEFAULT_BINDING}</code> or{" "}
                    <code className="text-amber-200/90">{WORKER_ALT_BINDING}</code>) is what URLs and the UI use.
                    The <strong className="text-zinc-200">bucket_name</strong> is the real R2 bucket.
                  </p>
                  <CodeBlock
                    label="wrangler.jsonc (excerpt)"
                    code={`"r2_buckets": [
  {
    "binding": "${WORKER_DEFAULT_BINDING}",
    "bucket_name": "my-assets"
  }
]`}
                  />
                  <p className="text-xs text-zinc-500">
                    Multi-bucket: add more bindings. Default scope uses the first of{" "}
                    <code className="text-zinc-400">{WORKER_DEFAULT_BINDING}</code> /{" "}
                    <code className="text-zinc-400">{WORKER_ALT_BINDING}</code>.
                  </p>
                </Step>
                <Step n={3} title="Create D1 (if you use admin features)">
                  <p>
                    The Worker expects a D1 binding named <code className="text-amber-200/90">DB</code>. Create a database, put its id in{" "}
                    <code className="text-amber-200/90">wrangler.jsonc</code>, then apply migrations:
                  </p>
                  <CodeBlock label="shell" code={`pnpm migrate:deploy`} />
                </Step>
                <Step n={4} title="Set secrets">
                  <CodeBlock
                    label="shell"
                    code={`npx wrangler secret put ${WORKER_AUTH_SECRET_NAME}
npx wrangler secret put ${WORKER_PRIVATE_LINK_SECRET_NAME}`}
                  />
                  <p>
                    <code className="text-amber-200/90">wrangler secret put</code> stores both as encrypted Secrets (not plaintext).
                    <code className="text-amber-200/90">{WORKER_AUTH_SECRET_NAME}</code> is the API key you paste into Multy R2.
                  </p>
                </Step>
                <Step n={5} title="Deploy">
                  <CodeBlock label="shell" code={`pnpm deploy:worker`} />
                  <p>
                    Copy the Worker URL (e.g. <code className="text-amber-200/90">https://multy-r2.&lt;you&gt;.workers.dev</code>).
                    Open it in a browser — you should see the health text <code className="text-amber-200/90">Multy R2 endpoint worker</code>.
                  </p>
                </Step>
              </ol>
            </section>

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
                    <code className="text-amber-200/90">GET /api/r2/bindings</code> with your API key and lets you pick a binding.
                    Each binding can have its own R2 custom domain entered in Multy (one domain per bucket).
                  </p>
                </Step>
                <Step n={3} title="Save and open">
                  <p>
                    Save to localStorage, then open the endpoint card. Upload, list, delete, and copy public URLs all go through{" "}
                    <strong className="text-zinc-200">your</strong> Worker — credentials never leave the browser except as{" "}
                    <code className="text-amber-200/90">x-api-key</code> to that host.
                  </p>
                </Step>
              </ol>
            </section>

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
                    <a className="text-amber-200 underline decoration-amber-300/30 hover:decoration-amber-300" href={WORKER_BUNDLE_DOWNLOAD_URL} target="_blank" rel="noreferrer">
                      {WORKER_BUNDLE_DOWNLOAD_URL}
                    </a>
                  </p>
                  <CodeBlock
                    label="local equivalent"
                    code={`pnpm build:worker-bundle
# → ${WORKER_BUNDLE_OUTDIR}/${WORKER_BUNDLE_ENTRY}
# CI renames to ${WORKER_RELEASE_ASSET} on the ${WORKER_RELEASE_TAG} release`}
                  />
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
              <Callout title="Recommendation">
                Point users at the rolling{" "}
                <a className="text-amber-200 underline decoration-amber-300/30" href={WORKER_RELEASE_URL} target="_blank" rel="noreferrer">
                  <code className="text-zinc-100">{WORKER_RELEASE_TAG}</code> release
                </a>{" "}
                (<code className="text-zinc-300">{WORKER_RELEASE_ASSET}</code>).
                Keep the hosted Pages app as the default UI so most people only paste a Worker.
                Offer repo + Wrangler for people who want their own deploy pipeline or a full fork.
              </Callout>
            </section>

            <section id="fork" className="scroll-mt-24 grid gap-3">
              <h2 className="text-xl font-bold text-zinc-50 font-display">Full fork: your UI and backend</h2>
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
