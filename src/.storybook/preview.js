import { initTestBackend } from '../client/backend/TestBackend';
import { configure } from 'mobx';
import { AppThemeProvider } from '../client/Theme';
import { registerPlugins } from '../client/plugin/BuiltInPlugins';
import { PluginManager } from '../client/plugin/PluginManager';
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

    return <AppThemeProvider>
      <Story/>
    </AppThemeProvider>
  }
]

export const parameters = {
  layout: 'fullscreen',
};
