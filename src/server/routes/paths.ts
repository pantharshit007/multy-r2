import { API_PREFIX, INTERNAL_PROXY_PREFIX } from "../constants";

export { API_PREFIX, INTERNAL_PROXY_PREFIX };

export function splitApiPath(pathname: string): string[] {
  return pathname.replace(/^\/api\/?/, "").split("/").filter(Boolean);
}

export function stripProxyPrefix(url: URL): URL {
  if (!url.pathname.startsWith(INTERNAL_PROXY_PREFIX)) {
    return url;
  }

  const next = new URL(url.toString());
  next.pathname = `/${url.pathname.slice(INTERNAL_PROXY_PREFIX.length).replace(/^\/+/, "")}`;
  return next;
}

export function shouldServeUiAssets(url: URL): boolean {
  return (
    url.pathname === "/" ||
    url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/buckets/")
  );
}
