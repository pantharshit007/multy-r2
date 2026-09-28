export function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

export function renderHead(page) {
  const tags = {
    description: page.description, robots: page.robots,
    author: page.author.name,
    "og:title": page.title, "og:description": page.description,
    "og:type": "website", "og:site_name": "Multy R2",
    ...page.socialImageMeta,
    "twitter:title": page.title,
    "twitter:description": page.description,
    ...(page.url ? { "og:url": page.url } : {}),
  };
  return `<title>${escapeHtml(page.title)}</title>\n` + Object.entries(tags).map(([name, value]) =>
    `<meta data-seo ${name.startsWith("og:") ? "property" : "name"}="${name}" content="${escapeHtml(value)}" />`,
  ).join("\n") + (page.url ? `\n<link data-seo rel="canonical" href="${escapeHtml(page.url)}" />\n<script data-seo type="application/ld+json">${JSON.stringify(page.schema).replace(/</g, "\\u003c")}</script>` : "");
}
