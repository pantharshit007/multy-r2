import type { SeoPage } from "../types/seo";

/** Override for independently hosted clients; never use a Worker API URL here. */
export const SITE_URL = (import.meta.env.VITE_SITE_URL || "https://multy.hrshit.in").replace(/\/$/, "");
export const PUBLIC_PAGES: Record<string, SeoPage> = {
  "/": {
    path: "/",
    title: "Multy R2 — Cloudflare R2 File Manager",
    description: "Manage multiple Cloudflare R2 buckets from one open-source dashboard. Upload, browse, organize, and share files through your own Worker endpoints.",
  },
  "/setup-guide": {
    path: "/setup-guide",
    title: "Cloudflare R2 Worker Setup Guide | Multy R2",
    description: "Set up your Cloudflare Worker, connect R2 buckets, configure API keys and custom domains, and start managing files with Multy R2's step-by-step guide.",
  },
};
export const PRIVATE_PAGE: SeoPage = {
  title: "Bucket Workspace | Multy R2",
  description: "Manage files in your connected Cloudflare R2 bucket.",
};
export const NOT_FOUND_PAGE: SeoPage = {
  title: "Page Not Found | Multy R2",
  description: "Return to Multy R2 to manage your Cloudflare R2 buckets or read the setup guide.",
};
