import * as ReactDOM from "react-dom";
import { App } from "./App";
import { configure } from "mobx";
import { ClientWorkspace } from "./ClientWorkspace";
import { ProfileManager } from "./ProfileManager";
import { Workbox } from "workbox-window";
import { AppThemeProvider } from "./Theme";
import { registerPlugins } from "./plugin/BuiltInPlugins";
import { ErrorBoundary } from "./ErrorBoundary/ErrorBoundary";
import { RemoteHttpStorage } from "./storage/RemoteHttpStorage";
import { MemoryCachedStorage } from "../common/storage/MemoryCachedStorage";
import { FileSettingsProvider } from "../common/workspace/FileSettingsProvider";


if ("serviceWorker" in navigator) {
  const wb = new Workbox("/sw.js");
  wb.register().catch(err => {
    console.error("failed to initialize workbox", err);
  });
}


configure({
  enforceActions: "never"
});


const root = document.getElementById("root");
const params = JSON.parse(root?.dataset.params ?? "{}");

const DEFAULT_WORKSPACE_ID = "default";

const remote = new RemoteHttpStorage(DEFAULT_WORKSPACE_ID);
const fs = new MemoryCachedStorage(remote);
ClientWorkspace.init(fs, DEFAULT_WORKSPACE_ID);
ProfileManager.instance.userName = params.userName;
FileSettingsProvider.init(fs);

try {
  registerPlugins(params.plugins);
} catch (error: any) {
  alert("Failed to register plugins: " + error.message);
}

ReactDOM.render(<>
  <ErrorBoundary>
    <AppThemeProvider>
      <App/>
    </AppThemeProvider>
  </ErrorBoundary>
</>, root);
