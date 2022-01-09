import { initTestBackend } from '../client/backend/TestBackend';
import { configure } from 'mobx';
import { AppThemeProvider } from '../client/Theme';
import { registerBuiltInPlugins } from '../client/plugin/BuiltInPlugins';
import { PluginManager } from '../client/plugin/PluginManager';


configure({
  enforceActions: "never"
});


export const decorators = [
  (Story) => {
    initTestBackend();
    if (PluginManager.instance.getPlugins().length === 0) {
      registerBuiltInPlugins();
    }
    return <AppThemeProvider>
      <Story/>
    </AppThemeProvider>
  }
]

export const parameters = {
  layout: 'fullscreen',
};
