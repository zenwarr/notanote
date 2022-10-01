export enum Platform {
  Web = "web",
  Electron = "electron",
  Android = "android",
  Ios = "ios"
}


let platform: Platform | undefined;


export function getPlatform(): Platform {
  if (platform) {
    return platform;
  }

  try {
    const cap = require("@capacitor/core");
    platform = cap.Capacitor.getPlatform() as Platform;
  } catch (e: any) {
    if (e.code === "MODULE_NOT_FOUND") {
      platform = Platform.Web;
    } else {
      throw e;
    }
  }

  return platform;
}
