import { StoragePath } from "@storage/StoragePath";


export function getFileRoutePath(path: StoragePath | string) {
  return `/f/${ encodeURIComponent(typeof path === "string" ? new StoragePath(path).normalized : path.normalized) }`
}

