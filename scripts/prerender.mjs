import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "vite";
import { escapeHtml, renderHead } from "./lib/seo.mjs";

const server = await createServer({ mode: "production", server: { middlewareMode: true }, appType: "custom" });
try {
  const { render, getSeo, PUBLIC_PAGES, SITE_URL } = await server.ssrLoadModule("/src/client/prerender.tsx");
  const origin = new URL(SITE_URL);
  if (!/^https?:$/.test(origin.protocol) || origin.pathname !== "/" || origin.search || origin.hash) {
    throw new Error("VITE_SITE_URL must be an HTTP(S) origin without a path, query, or fragment.");
  }
  const template = await readFile("dist/index.html", "utf8");
  for (const path of Object.keys(PUBLIC_PAGES)) {
    const directory = path === "/" ? "dist" : `dist${path}`;
    await mkdir(directory, { recursive: true });
    const html = template.replace(/<title>.*?<\/title>/, renderHead(getSeo(path)))
      .replace('<div id="root"></div>', `<div id="root">${await render(path)}</div>`);
    await writeFile(`${directory}/index.html`, html);
  }
  // Preserve an unpersonalized SPA shell for locally saved bucket URLs.
  await writeFile("dist/workspace.html", template.replace(/<title>.*?<\/title>/, renderHead(getSeo("/buckets/workspace"))));
  await writeFile("dist/404.html", template.replace(/<title>.*?<\/title>/, renderHead(getSeo("/not-found"))).replace('<div id="root"></div>', `<div id="root">${await render("/not-found")}</div>`));
  await writeFile("dist/robots.txt", `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);
  await writeFile("dist/sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${Object.values(PUBLIC_PAGES).map(({ path }) => `<url><loc>${escapeHtml(`${SITE_URL}${path}`)}</loc></url>`).join("")}</urlset>\n`);
} finally {
  await server.close();
}
