import { initTestBackend } from '../client/backend/TestBackend';
import { configure } from 'mobx';
import { AppThemeProvider } from '../client/Theme';
import { registerPlugins } from '../client/plugin/BuiltInPlugins';
import { PluginManager } from '../client/plugin/PluginManager';
import { MemoryCachedStorage } from '../storage/MemoryCachedStorage';
import { ClientWorkspace } from '../client/ClientWorkspace';
import { FileSettingsProvider } from '../common/workspace/FileSettingsProvider';
import { LocalSyncProvider } from '../sync/SyncProvider';
import { KVStorageLayer } from '../storage/KVStorageLayer';
import { IdbKvStorage } from '../client/storage/IdbKvStorage';


configure({
  enforceActions: "never"
});


const DEFAULT_WORKSPACE_ID = "default";


export const decorators = [
  (Story) => {
    initTestBackend();
    if (PluginManager.instance.getPlugins().length === 0) {
      registerPlugins();
    }

    const remote = new KVStorageLayer(new IdbKvStorage());
    const memCached = new MemoryCachedStorage(remote);

    ClientWorkspace.init(memCached, new LocalSyncProvider(remote), DEFAULT_WORKSPACE_ID);
    FileSettingsProvider.init(memCached);

    return <AppThemeProvider>
      <Story/>
    </AppThemeProvider>
  }
]

export const parameters = {
  layout: 'fullscreen',
};
