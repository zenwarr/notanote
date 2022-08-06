import { initTestBackend } from '../client/backend/TestBackend';
import { configure } from 'mobx';
import { AppThemeProvider } from '../client/Theme';
import { registerPlugins } from '../client/plugin/BuiltInPlugins';
import { PluginManager } from '../client/plugin/PluginManager';
import { MemoryCachedStorage } from '../storage/MemoryCachedStorage';
import { ClientWorkspace } from '../client/ClientWorkspace';
import { FileSettingsProvider } from '../common/workspace/FileSettingsProvider';
import { KVStorageLayer } from '../storage/KVStorageLayer';
import { IdbKvStorage } from '../client/storage/IdbKvStorage';
import { RemoteSyncWorker } from '../sync/RemoteSyncWorker';


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

    const remote = new KVStorageLayer(new IdbKvStorage("remote-fs-storage"));
    const local = new KVStorageLayer(new IdbKvStorage("local-fs-storage"));

    const remoteSyncWorker = new RemoteSyncWorker(remote);
    const memCached = new MemoryCachedStorage(local);

    ClientWorkspace.init(memCached, remoteSyncWorker, DEFAULT_WORKSPACE_ID);
    FileSettingsProvider.init(memCached);

    return <AppThemeProvider>
      <Story/>
    </AppThemeProvider>
  }
]

export const parameters = {
  layout: 'fullscreen',
};
