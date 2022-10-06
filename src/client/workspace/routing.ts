import { StoragePath } from "@storage/storage-path";


export function getFileRoutePath(path: StoragePath | string) {
  return `/f${ typeof path === "string" ? new StoragePath(path).normalized : path.normalized }`
}

