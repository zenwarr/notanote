import { diaryPlugin } from "./DiaryEditorPlugin";
import { PluginLoadSpec, PluginManager } from "./PluginManager";
import { RemotePluginSpec } from "../../common/plugin";
import { pluginConfigPlugin } from "./PluginConfigPlugin";


export function registerPlugins(plugins: RemotePluginSpec[] = []) {
  const pm = PluginManager.instance;
  pm.registerPlugin(diaryPlugin);
  pm.registerPlugin(pluginConfigPlugin);

  for (const plugin of plugins) {
    pm.registerPlugin({
      ...plugin,
      load: plugin.url
    });
  }
}
