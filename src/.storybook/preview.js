import { initTestBackend } from '../client/backend/TestBackend';
import { configure } from 'mobx';
import { AppThemeProvider } from '../client/Theme';
import { registerPlugins } from '../client/plugin/BuiltInPlugins';
import { PluginManager } from '../client/plugin/PluginManager';
import { MemoryCachedStorage } from '../common/storage/MemoryCachedStorage';
import { ClientWorkspace } from '../client/ClientWorkspace';
import { MemoryStorage } from '../client/storage/MemoryStorage';
import { FileSettingsProvider } from '../common/workspace/FileSettingsProvider';


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

    const remote = new MemoryStorage({
      path: "/",
      stats: { isDirectory: true, createTs: undefined, updateTs: undefined },
      children: [
        {
          path: "/.note",
          stats: { isDirectory: true, createTs: undefined, updateTs: undefined },
          children: [
            {
              path: "/.note/settings.json",
              stats: { isDirectory: false, createTs: undefined, updateTs: undefined },
              textContent: "{}"
            }
          ]
        },
        {
          path: "/file.md",
          stats: { isDirectory: false, createTs: undefined, updateTs: undefined },
          textContent: "# Lorem ipsum"
        }
      ]
    });
    const fs = new MemoryCachedStorage(remote);
    ClientWorkspace.init(fs, DEFAULT_WORKSPACE_ID);
    FileSettingsProvider.init(fs);

    return <AppThemeProvider>
      <Story/>
    </AppThemeProvider>
  }
]

export const parameters = {
  layout: 'fullscreen',
};
