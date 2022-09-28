import { initTestBackend } from '../client/backend/TestBackend';
import { configure } from 'mobx';
import { AppThemeProvider } from '../client/Theme';
import { registerPlugins } from '../client/plugin/BuiltInPlugins';
import { PluginManager } from '../client/plugin/PluginManager';
import { MemoryCachedStorage } from '../storage/MemoryCachedStorage';
import { ClientWorkspace } from '../client/ClientWorkspace';
import { FileSettingsProvider } from '../common/workspace/FileSettingsProvider';
import { KVEntryStorage } from '../storage/KVEntryStorage';
import { IdbKvStorage } from '../client/storage/IdbKvStorage';
import { RemoteSyncWorker } from '../sync/RemoteSyncWorker';
import { StorageProviderManager } from '../client/storage/StorageProvider';
import { registerStorageProviders } from '../client/storage/StorageRegistration';


configure({
  enforceActions: "never"
});


export const decorators = [
  (Story) => {
    initTestBackend();
    if (PluginManager.instance.getPlugins().length === 0) {
      registerPlugins();
    }

    if (StorageProviderManager.instance.getProviders().length === 0) {
      registerStorageProviders();
    }

    const remote = new KVEntryStorage(new IdbKvStorage("remote-fs-storage"));
    const local = new KVEntryStorage(new IdbKvStorage("local-fs-storage"));

    const remoteSyncWorker = new RemoteSyncWorker(remote);
    const memCached = new MemoryCachedStorage(local);

    ClientWorkspace.init(memCached, remoteSyncWorker);
    FileSettingsProvider.init(memCached);

    return <AppThemeProvider>
      <Story/>
    </AppThemeProvider>
  }
]

export const parameters = {
  layout: 'fullscreen',
};
