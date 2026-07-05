import type { Bucket, EndpointBucketBinding } from "../../shared";
import { BINDING_NAME_REGEX } from "../../shared/constants";
import { DEFAULT_R2_BINDING_NAMES, R2_PROBE_LIMIT } from "../constants";
import type { Env } from "../env";
import { ApiError } from "../errors";
import { BUCKET_NAMES } from "../generated/bucketNames";

export function getBoundBucket(env: Env, bucket: Bucket): R2Bucket {
  if (!bucket.bindingName) {
    throw new ApiError(400, "This bucket needs a Worker R2 binding for file operations");
  }

  const binding = env[bucket.bindingName];
  if (!isR2Bucket(binding)) {
    throw new ApiError(400, `R2 binding '${bucket.bindingName}' is not configured on this Worker`);
  }

  return binding;
}

export function getDefaultEndpointBucket(env: Env): R2Bucket {
  const bucket = env[DEFAULT_R2_BINDING_NAMES[0]] ?? env[DEFAULT_R2_BINDING_NAMES[1]];
  if (!isR2Bucket(bucket)) {
    throw new ApiError(500, `Configure an R2 binding named ${DEFAULT_R2_BINDING_NAMES[0]} or ${DEFAULT_R2_BINDING_NAMES[1]} for endpoint mode`);
  }

  return bucket;
}

export function getSelectedEndpointBucket(env: Env, bucketBindingName: string | null): R2Bucket {
  const bindingName = normalizeBucketBindingName(bucketBindingName);
  if (!bindingName) return getDefaultEndpointBucket(env);

  const bucket = getEndpointBucketBinding(env, bindingName);
  if (!bucket) {
    throw new ApiError(400, `R2 binding '${bindingName}' is not configured on this Worker`);
  }

  return bucket;
}

export function getEndpointBucketBinding(env: Env, bucketBindingName: string | null): R2Bucket | null {
  const bindingName = normalizeBucketBindingName(bucketBindingName);
  if (!bindingName) return null;

  const bucket = env[bindingName];
  return isR2Bucket(bucket) ? bucket : null;
}

export async function listEndpointBucketBindings(env: Env): Promise<EndpointBucketBinding[]> {
  const bindings = await Promise.all(
    Object.entries(env).map(async ([bindingName, value]) => {
      if (!isR2Bucket(value)) return null;

      try {
        await value.list({ limit: R2_PROBE_LIMIT });
        return {
          id: bindingName,
          // Friendly label is the real bucket_name from wrangler.jsonc; the
          // binding name stays the stable identifier used in URLs.
          name: BUCKET_NAMES[bindingName] ?? bindingName,
          bindingName,
        } satisfies EndpointBucketBinding;
      } catch {
        return null;
      }
    }),
  );

  return bindings
    .filter((binding) => binding !== null)
    .sort((left, right) => bucketBindingSortRank(left.bindingName) - bucketBindingSortRank(right.bindingName) || left.bindingName.localeCompare(right.bindingName));
}

function isR2Bucket(value: unknown): value is R2Bucket {
  return Boolean(
    value &&
      typeof value === "object" &&
      "head" in value &&
      "list" in value &&
      "put" in value &&
      "get" in value &&
      "delete" in value &&
      typeof value.head === "function" &&
      typeof value.list === "function" &&
      typeof value.put === "function" &&
      typeof value.get === "function" &&
      typeof value.delete === "function",
  );
}

function normalizeBucketBindingName(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!BINDING_NAME_REGEX.test(trimmed)) {
    throw new ApiError(400, "bucketId must be a valid R2 binding name (letters, digits, underscores)");
  }
  return trimmed;
}

function bucketBindingSortRank(bindingName: string): number {
  if (bindingName === DEFAULT_R2_BINDING_NAMES[0]) return 0;
  if (bindingName === DEFAULT_R2_BINDING_NAMES[1]) return 1;
  return 2;
}
