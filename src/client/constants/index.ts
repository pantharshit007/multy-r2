export const ADMIN_STORAGE_KEY = "multy-r2:admin-api";
export const ENDPOINTS_STORAGE_KEY = "multy-r2:endpoints";
export const BUCKET_PICKER_DEBOUNCE_MS = 250;
export const MAX_UPLOAD_HISTORY_ENTRIES = 6;
export const EMPTY_API_BASE = "";
export const SETTINGS_SAVED_FEEDBACK_MS = 2000;
/** Minimum time the refresh button stays in its loading state so the spinner is visible. */
export const REFRESH_FEEDBACK_MIN_MS = 500;

export const SETUP_GUIDE_PATH = "/setup-guide";
export const GITHUB_REPO_SLUG = "pantharshit007/multy-r2";
export const GITHUB_REPO_URL = `https://github.com/${GITHUB_REPO_SLUG}`;
export const GITHUB_ISSUES_URL = `${GITHUB_REPO_URL}/issues`;
export const CLOUDFLARE_DASHBOARD_URL = "https://dash.cloudflare.com";
export const WORKER_DEFAULT_BINDING = "R2_BUCKET";
export const WORKER_ALT_BINDING = "BUCKET_A";
export const WORKER_AUTH_SECRET_NAME = "AUTH_KEY_SECRET";
export const WORKER_PRIVATE_LINK_SECRET_NAME = "PRIVATE_LINK_SECRET";
export const WORKER_BUNDLE_OUTDIR = "dist-worker";
export const WORKER_BUNDLE_ENTRY = "index.js";
export const WORKER_RELEASE_TAG = "worker";
export const WORKER_RELEASE_ASSET = "worker.js";
/** Orphan branch CI force-pushes so raw.githubusercontent.com can show the JS inline. */
export const WORKER_BUNDLE_BRANCH = "release-worker-js";
export const WORKER_RELEASE_URL = `${GITHUB_REPO_URL}/releases/tag/${WORKER_RELEASE_TAG}`;
/** Release asset — browsers usually download this. */
export const WORKER_BUNDLE_DOWNLOAD_URL = `${GITHUB_REPO_URL}/releases/download/${WORKER_RELEASE_TAG}/${WORKER_RELEASE_ASSET}`;
/** Inline-viewable source (select-all → copy). Prefer this in the setup guide. */
export const WORKER_BUNDLE_RAW_URL = `https://raw.githubusercontent.com/${GITHUB_REPO_SLUG}/${WORKER_BUNDLE_BRANCH}/${WORKER_RELEASE_ASSET}`;

export const SETUP_GUIDE_IMAGES = {
  workersNav: "/setup-guide/cf-workers-pages-nav.png",
  createWorkerHello: "/setup-guide/create-worker-hello-world.png",
  createWorkerName: "/setup-guide/create-worker-name.png",
  workerEditorPaste: "/setup-guide/worker-editor-paste.png",
  workerOverview: "/setup-guide/worker-overview-bindings.png",
  workerSecrets: "/setup-guide/worker-settings-secrets.png",
  workerBindings: "/setup-guide/worker-bindings-r2-d1.png",
  r2CustomDomain: "/setup-guide/r2-custom-domain.png",
  multyEndpoint: "/setup-guide/multy-new-endpoint.png",
} as const;
