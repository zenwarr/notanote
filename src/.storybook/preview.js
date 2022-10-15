import { initTestBackend } from '../client/backend/test-backend';
import { configure } from 'mobx';
import { AppThemeProvider } from '../client/theme/theme';
import { StorageProviderManager } from '../client/storage/storage-provider';
import { registerStorageProviders } from '../client/storage/storage-registration';


configure({
  enforceActions: "never"
});


export const decorators = [
  (Story) => {
    initTestBackend();

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
