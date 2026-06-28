const INTERNAL_PROXY_PREFIX = "/_internal/proxy";

export function normalizeApiBase(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) return window.location.origin;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function normalizeEndpoint(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function normalizeOptionalEndpoint(value: string | null | undefined): string {
  const trimmed = (value ?? "").trim();
  return trimmed ? normalizeEndpoint(trimmed) : "";
}

export function normalizeOptionalText(value: string | null | undefined): string {
  return (value ?? "").trim();
}

export function resolveEndpointUrl(target: URL): URL {
  if (isSameOriginEndpoint(target)) {
    return new URL(`${INTERNAL_PROXY_PREFIX}${target.pathname}${target.search}`, target.origin);
  }

  return target;
}

export function isSameOriginEndpoint(url: URL): boolean {
  const currentOrigin = globalThis.location?.origin;
  return Boolean(currentOrigin && url.origin === currentOrigin);
}
