import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const home = await readFile("dist/index.html", "utf8");
const guide = await readFile("dist/setup-guide/index.html", "utf8");
const workspace = await readFile("dist/workspace.html", "utf8");
const missing = await readFile("dist/404.html", "utf8");
const sitemap = await readFile("dist/sitemap.xml", "utf8");
const robots = await readFile("dist/robots.txt", "utf8");
const redirects = await readFile("dist/_redirects", "utf8");
for (const html of [home, guide, workspace, missing]) {
  assert.match(html, /name="author" content="Harshit Pant"/);
  const ogImage = html.match(/property="og:image" content="([^"]+)"/);
  const twitterImage = html.match(/name="twitter:image" content="([^"]+)"/);
  assert.ok(ogImage, "Every page needs a social preview image");
  assert.equal(ogImage[1], "https://res.cloudinary.com/di0av3xly/image/upload/v1790578223/multy/multy-r2-og-image_1200x630.jpg");
  assert.equal(twitterImage?.[1], ogImage[1]);
  assert.match(html, /name="twitter:card" content="summary_large_image"/);
}
const titles = new Set();
for (const html of [home, guide]) {
  assert.equal((html.match(/<h1\b/g) || []).length, 1, "Public content must be prerendered");
  assert.equal((html.match(/rel="canonical"/g) || []).length, 1);
  assert.match(html, /content="index, follow"/);
  assert.match(html, /property="og:description"/);
  assert.match(html, /name="twitter:card"/);
  const schema = JSON.parse(html.match(/type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  assert.deepEqual(schema.author, {
    "@type": "Person",
    name: "Harshit Pant",
    alternateName: "pantharshit007",
    url: "https://hrshit.in/",
  });
  assert.ok(sitemap.includes(`<loc>${schema.url}</loc>`));
  titles.add(html.match(/<title>(.*?)<\/title>/)[1]);
}
assert.equal(titles.size, 2, "Public pages need distinct titles");
assert.match(home, /Manage Cloudflare R2 buckets/);
assert.match(home, /aria-label="Multy R2 on GitHub/);
assert.match(guide, /AUTH_KEY_SECRET/);
const guideCanonical = guide.match(/rel="canonical" href="([^"]+)"/)[1];
assert.equal(new URL(guideCanonical).pathname, "/setup-guide/");
assert.ok(sitemap.includes(`<loc>${guideCanonical}</loc>`));
assert.doesNotMatch(sitemap, /\/setup-guide<\/loc>/);
for (const html of [workspace, missing]) {
  assert.match(html, /content="noindex, follow"/);
  assert.doesNotMatch(html, /rel="canonical"|application\/ld\+json/);
}
assert.match(missing, /Page not found/);
assert.equal((sitemap.match(/<loc>/g) || []).length, 2);
assert.doesNotMatch(robots, /Disallow:.*buckets/, "Crawlers must be able to read workspace noindex");
assert.match(redirects, /\/buckets\/\* \/workspace.html 200/);
assert.doesNotMatch(redirects, /^\/\*\s/m, "Unknown URLs must reach the Pages 404 response");
console.log("SEO build checks passed");
