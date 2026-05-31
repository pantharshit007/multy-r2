import type { Bucket, EndpointBucketBinding } from "../../../shared";
import type { Env } from "../env";
import { ApiError } from "../errors";

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
  const bucket = env.R2_BUCKET ?? env.BUCKET_A;
  if (!isR2Bucket(bucket)) {
    throw new ApiError(500, "Configure an R2 binding named R2_BUCKET or BUCKET_A for endpoint mode");
  }

  return bucket;
}

export function getSelectedEndpointBucket(env: Env, bucketBindingName: string | null): R2Bucket {
  const bindingName = normalizeBucketBindingName(bucketBindingName);
  if (!bindingName) return getDefaultEndpointBucket(env);

  const bucket = env[bindingName];
  if (!isR2Bucket(bucket)) {
    throw new ApiError(400, `R2 binding '${bindingName}' is not configured on this Worker`);
  }

  return bucket;
}

export function listEndpointBucketBindings(env: Env): EndpointBucketBinding[] {
  return Object.entries(env)
    .filter(([, value]) => isR2Bucket(value))
    .map(([bindingName]) => ({
      id: bindingName,
      name: bindingName,
      bindingName,
    }))
    .sort((left, right) => bucketBindingSortRank(left.bindingName) - bucketBindingSortRank(right.bindingName) || left.bindingName.localeCompare(right.bindingName));
}

function isR2Bucket(value: unknown): value is R2Bucket {
  return Boolean(
    value &&
      typeof value === "object" &&
      "list" in value &&
      "put" in value &&
      "get" in value &&
      "delete" in value,
  );
}

function normalizeBucketBindingName(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^[A-Z][A-Z0-9_]*$/.test(trimmed)) {
    throw new ApiError(400, "bucketId must look like BUCKET_A or BUCKET_B");
  }
  return trimmed;
}

function bucketBindingSortRank(bindingName: string): number {
  if (bindingName === "R2_BUCKET") return 0;
  if (bindingName === "BUCKET_A") return 1;
  return 2;
}
