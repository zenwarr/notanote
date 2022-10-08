import { dialog, ipcMain } from "electron";
import { autoUpdater } from "electron-updater";
import { ElectronCapacitorApp } from "./setup";


export function setIpcHandlers(app: ElectronCapacitorApp) {
  ipcMain.handle("chooseDirectory", async () => {
    return dialog.showOpenDialog(app.getMainWindow(), { properties: [ "openDirectory" ] });
  });

  ipcMain.handle("selfUpdate", async () => {
    if (!autoUpdater.isUpdaterActive()) {
      await dialog.showMessageBox(app.getMainWindow(), {
        type: "info",
        title: "Update",
        message: "Auto-updater is not available for this platform"
      });

      return;
    }

    return new Promise<void>((resolve, reject) => {
      autoUpdater.autoDownload = false;
      autoUpdater.checkForUpdates();

      autoUpdater.on("update-available", async (update) => {
        const r = await dialog.showMessageBox(app.getMainWindow(), {
          type: "info",
          title: "Update available",
          message: `New version ${ update.version  } is available. Do you want to download it now?`,
          buttons: [ "Yes", "No" ]
        });

        if (r.response === 0) {
          await autoUpdater.downloadUpdate();
        }
      });

      autoUpdater.on("update-downloaded", () => {
        autoUpdater.quitAndInstall(false, true);
      });

      autoUpdater.on("error", async (error) => {
        await dialog.showMessageBox(app.getMainWindow(), {
          type: "error",
          title: "Update error",
          message: "An error occurred while checking for updates: " + error.message,
        });

        reject(error);
      });

      autoUpdater.on("update-not-available", async () => {
        await dialog.showMessageBox(app.getMainWindow(), {
          type: "info",
          title: "No update available",
          message: "No update available"
        });

        resolve();
      });
    });
  });
}
