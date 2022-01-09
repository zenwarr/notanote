import { diaryPlugin } from "../DiaryEditor";
import { PluginManager } from "./PluginManager";


export function registerBuiltInPlugins() {
  const pm = PluginManager.instance;
  pm.registerPlugin(diaryPlugin);
}
