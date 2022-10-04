import { getPlatform, Platform } from "./platform/getPlatform";


if (getPlatform() === Platform.Android) {
  (window as any).process = {
    env: {},
    cwd: () => "",
  };
}
