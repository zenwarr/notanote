import { getPlatform, Platform } from "./platform/get-platform";


if (getPlatform() === Platform.Android) {
  (window as any).process = {
    env: {},
    cwd: () => "",
  };
}
