import { NOT_FOUND_PAGE, PRIVATE_PAGE, PUBLIC_PAGES, SITE_URL, SOCIAL_IMAGE_META } from "../constants/seo";
import { GITHUB_REPO_URL } from "../constants";

export function getSeo(pathname: string) {
  const path = pathname.replace(/\/$/, "") || "/";
  const page = PUBLIC_PAGES[path] ?? (path.startsWith("/buckets/") ? PRIVATE_PAGE : NOT_FOUND_PAGE);
  const url = page.path ? `${SITE_URL}${page.path}` : undefined;
  return {
    ...page,
    socialImageMeta: SOCIAL_IMAGE_META,
    url,
    robots: url ? "index, follow" : "noindex, follow",
    schema: url ? {
      "@context": "https://schema.org",
      "@type": path === "/" ? "WebApplication" : "TechArticle",
      name: page.title,
      description: page.description,
      url,
      ...(path === "/" ? { applicationCategory: "UtilitiesApplication", operatingSystem: "Web browser", sameAs: GITHUB_REPO_URL } : {}),
    } : undefined,
  };
}

export function applySeo(pathname: string) {
  const page = getSeo(pathname);
  document.title = page.title;
  document.head.querySelectorAll('[data-seo]').forEach((node) => node.remove());
  const tags = {
    description: page.description,
    robots: page.robots,
    "og:title": page.title,
    "og:description": page.description,
    "og:type": "website",
    "og:site_name": "Multy R2",
    ...page.socialImageMeta,
    "twitter:title": page.title,
    "twitter:description": page.description,
    ...(page.url ? { "og:url": page.url } : {}),
  };
  for (const [name, content] of Object.entries(tags)) {
    const meta = document.createElement("meta");
    meta.setAttribute(name.startsWith("og:") ? "property" : "name", name);
    meta.content = content;
    meta.dataset.seo = "";
    document.head.append(meta);
  }
  if (page.url) {
    const canonical = document.createElement("link");
    canonical.rel = "canonical";
    canonical.href = page.url;
    canonical.dataset.seo = "";
    document.head.append(canonical);
    const schema = document.createElement("script");
    schema.type = "application/ld+json";
    schema.dataset.seo = "";
    schema.textContent = JSON.stringify(page.schema);
    document.head.append(schema);
  }
}
