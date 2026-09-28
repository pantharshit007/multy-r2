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

export const SOCIAL_IMAGE_URL = "https://res.cloudinary.com/di0av3xly/image/upload/v1790578223/multy/multy-r2-og-image_1200x630.jpg";
export const SOCIAL_IMAGE_META = {
  "og:image": SOCIAL_IMAGE_URL,
  "og:image:width": "1200",
  "og:image:height": "630",
  "og:image:type": "image/jpeg",
  "og:image:alt": "Multy R2 — Cloudflare R2 File Manager",
  "twitter:card": "summary_large_image",
  "twitter:image": SOCIAL_IMAGE_URL,
  "twitter:image:alt": "Multy R2 — Cloudflare R2 File Manager",
};
