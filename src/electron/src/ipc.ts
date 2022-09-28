import { dialog, ipcMain } from "electron";
import { ElectronCapacitorApp } from "./setup";


export function setIpcHandlers(app: ElectronCapacitorApp) {
  ipcMain.handle("chooseDirectory", async () => {
    return dialog.showOpenDialog(app.getMainWindow(), { properties: [ "openDirectory" ] })
  });
}
