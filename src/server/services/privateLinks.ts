import type { Env } from "../env";
import { ApiError } from "../errors";
import { hmacSha256Base64Url } from "../utils/crypto";
import { encodeKey } from "../utils/objectKeys";

export async function createPrivateObjectLink(env: Env, bucketId: string, key: string, expires: number, origin: string): Promise<string> {
  const signature = await signPrivateLink(env, bucketId, key, expires);
  const privateUrl = new URL(`/api/buckets/${encodeURIComponent(bucketId)}/signed/${encodeKey(key)}`, origin);
  privateUrl.searchParams.set("expires", String(expires));
  privateUrl.searchParams.set("signature", signature);
  return privateUrl.toString();
}

export async function signPrivateLink(env: Env, bucketId: string, key: string, expires: number): Promise<string> {
  if (!env.PRIVATE_LINK_SECRET || env.PRIVATE_LINK_SECRET.startsWith("replace-with")) {
    throw new ApiError(500, "PRIVATE_LINK_SECRET must be configured before generating private links");
  }

  return hmacSha256Base64Url(env.PRIVATE_LINK_SECRET, `${bucketId}:${key}:${expires}`);
}
