import { getPlatform, Platform } from "./platform/get-platform";


if (getPlatform() === Platform.Android || getPlatform() === Platform.Web) {
  (window as any).process = {
    env: {},
    cwd: () => "",
  };
}
