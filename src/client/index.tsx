import "setup-env";
import { createRoot } from "react-dom/client";
import { configure } from "mobx";
import { Workbox } from "workbox-window";
import { registerStorageProviders } from "./storage/storage-registration";
import { AppThemeProvider } from "./theme/theme";
import { ErrorBoundary } from "./error-boundary/error-boundary";
import { AppConfigurationGuard } from "storage-config/app-configuration-guard";


if ("serviceWorker" in navigator) {
  const wb = new Workbox("/sw.js");
  wb.register().catch(err => {
    console.error("failed to initialize workbox", err);
  });
}

if ("Worker" in window) {
  const bgWorker = new Worker("/background-worker.js");
  bgWorker.onmessage = e => {
    console.log("worker message received: ", e);
  };
}


configure({
  enforceActions: "never"
});


const root = document.getElementById("root");
registerStorageProviders();

createRoot(root!).render(<>
  <ErrorBoundary>
    <AppThemeProvider>
      <AppConfigurationGuard/>
    </AppThemeProvider>
  </ErrorBoundary>
</>);
