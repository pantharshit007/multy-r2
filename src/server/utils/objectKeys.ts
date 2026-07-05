import { ApiError } from "../errors";

export { encodeKey } from "../../shared/utils/objectKeys";

export function sanitizeObjectKey(value: string): string {
  const key = value.replace(/^\/+/, "").trim();
  if (!key || key === "." || key.includes("..")) {
    throw new ApiError(400, "Object key is invalid");
  }
  return key;
}
