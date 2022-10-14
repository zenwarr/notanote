import { StoragePath } from "@storage/storage-path";
import { getPlatform, Platform } from "../platform/get-platform";


export function getFileRoutePath(path: StoragePath | string) {
  return `/f${ typeof path === "string" ? new StoragePath(path).normalized : path.normalized }`
}


function isExternalLink(link: string) {
  return !!(link.startsWith("https:") || link.startsWith("http:"));
}


export function openLink(link: string) {
  if (isExternalLink(link)) {
    if (getPlatform() === Platform.Electron) {
      electronUtils.openExternalLink(link);
    }

    window.open(link, "_blank");
  }
}
