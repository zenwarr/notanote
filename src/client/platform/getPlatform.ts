import { Capacitor } from "@capacitor/core";


export enum Platform {
  Web = "web",
  Electron = "electron",
  Android = "android",
  Ios = "ios"
}


export function getPlatform(): Platform {
  return Capacitor.getPlatform() as Platform;
}
