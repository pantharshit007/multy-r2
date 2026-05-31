export const API_PREFIX = "/api";
export const LOCAL_ENDPOINT_PREFIX = "/local-r2-endpoint";

export function splitApiPath(pathname: string): string[] {
  return pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean);
}

export function normalizeEndpointUrl(url: URL): URL {
  if (!url.pathname.startsWith(LOCAL_ENDPOINT_PREFIX)) {
    return url;
  }

  const next = new URL(url.toString());
  next.pathname = `/${url.pathname.slice(LOCAL_ENDPOINT_PREFIX.length).replace(/^\/+/, "")}`;
  return next;
}

export function shouldServeUiAssets(url: URL): boolean {
  return url.pathname === "/" || url.pathname.startsWith("/assets/") || url.pathname.startsWith("/buckets/");
}
