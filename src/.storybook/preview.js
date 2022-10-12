import { initTestBackend } from '../client/backend/TestBackend';
import { configure } from 'mobx';
import { AppThemeProvider } from '../client/theme/theme';
import { StorageProviderManager } from '../client/storage/StorageProvider';
import { registerStorageProviders } from '../client/storage/StorageRegistration';


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
