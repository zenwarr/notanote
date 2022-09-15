import { createRoot } from "react-dom/client";
import { KVEntryStorage } from "@storage/KVEntryStorage";
import { App } from "./App";
import { configure } from "mobx";
import { ClientWorkspace } from "./ClientWorkspace";
import { ProfileManager } from "./ProfileManager";
import { Workbox } from "workbox-window";
import { HttpSyncProvider } from "./storage/HttpSyncProvider";
import { IdbKvStorage } from "./storage/IdbKvStorage";
import { AppThemeProvider } from "./Theme";
import { registerPlugins } from "./plugin/BuiltInPlugins";
import { ErrorBoundary } from "./error-boundary/ErrorBoundary";
import { MemoryCachedStorage } from "@storage/MemoryCachedStorage";
import { FileSettingsProvider } from "@common/workspace/FileSettingsProvider";


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

const syncAdapter = new HttpSyncProvider(DEFAULT_WORKSPACE_ID);

const local = new MemoryCachedStorage(new KVEntryStorage(new IdbKvStorage()));

ClientWorkspace.init(local, syncAdapter, DEFAULT_WORKSPACE_ID);
ProfileManager.instance.userName = params.userName;
FileSettingsProvider.init(local);

try {
  registerPlugins(params.plugins);
} catch (error: any) {
  alert("Failed to register plugins: " + error.message);
}

createRoot(root!).render(<>
  <ErrorBoundary>
    <AppThemeProvider>
      <App/>
    </AppThemeProvider>
  </ErrorBoundary>
</>);
