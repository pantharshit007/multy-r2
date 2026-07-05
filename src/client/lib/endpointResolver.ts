import { EMPTY_API_BASE, FALLBACK_API_BASE } from "../constants";

export function normalizeApiBase(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) return EMPTY_API_BASE;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const protocol = globalThis.location?.protocol === "http:" ? "http:" : "https:";
  return `${protocol}//${trimmed}`;
}

export function resolveApiBase(value: string): string {
  return normalizeApiBase(value) || window.location.origin || FALLBACK_API_BASE;
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

