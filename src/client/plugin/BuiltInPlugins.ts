import { PluginManager } from "./PluginManager";
import { RemotePluginSpec } from "../../common/plugin";
import { pluginConfigPlugin } from "./PluginConfigPlugin";


export function registerPlugins(plugins: RemotePluginSpec[] = []) {
  const pm = PluginManager.instance;
  pm.registerPluginAndNotFail(pluginConfigPlugin);

  for (const plugin of plugins) {
    pm.registerPluginAndNotFail({
      ...plugin,
      load: plugin.url
    });
  }
}
