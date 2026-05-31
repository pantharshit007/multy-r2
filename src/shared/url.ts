export function joinUrl(base: string, key: string): string {
  const cleanBase = base.replace(/\/+$/, "");
  const hasTrailingSlash = key.endsWith("/");
  const cleanKey = key
    .split("/")
    .filter(Boolean)
    .map((part) => encodeURIComponent(part))
    .join("/");

  return `${cleanBase}/${cleanKey}${hasTrailingSlash ? "/" : ""}`;
}
