export const API_PREFIX = "/api";
export const INTERNAL_ENDPOINT_PREFIX = "/_multy/endpoint";

export function splitApiPath(pathname: string): string[] {
  return pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean);
}

export function normalizeEndpointUrl(url: URL): URL {
  if (!url.pathname.startsWith(INTERNAL_ENDPOINT_PREFIX)) {
    return url;
  }

  const next = new URL(url.toString());
  next.pathname = `/${url.pathname.slice(INTERNAL_ENDPOINT_PREFIX.length).replace(/^\/+/, "")}`;
  return next;
}

export function shouldServeUiAssets(url: URL): boolean {
  return (
    url.pathname === "/" ||
    url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/buckets/")
  );
}
