import type { Bucket } from "../../../shared";
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
