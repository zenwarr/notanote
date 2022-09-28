import { FileSettingsProvider } from "@common/workspace/FileSettingsProvider";
import { Alert, Box, CircularProgress } from "@mui/material";
import { MemoryCachedStorage } from "@storage/MemoryCachedStorage";
import { RemoteSyncProvider } from "@sync/RemoteSyncProvider";
import { useEffect, useMemo, useState } from "react";
import { App } from "../App";
import { ClientWorkspace } from "../ClientWorkspace";
import { StorageConfig, StorageProviderManager } from "../storage/StorageProvider";
import { StorageConfigView } from "./StorageConfigView";


export function AppConfigurationGuard() {
  const config = useMemo(() => StorageProviderManager.instance.getStorageConfig(), []);
  const [ initializing, setInitializing ] = useState(true);
  const [ ready, setReady ] = useState(false);
  const [ storageInitError, setStorageInitError ] = useState<string | undefined>();

  useEffect(() => { applyConfig() }, []);

  async function applyConfig(config?: StorageConfig) {
    setInitializing(true);
    try {
      const inited = await initialize(config);
      if (inited) {
        setReady(true);
      }
      setInitializing(false);
    } catch (error: any) {
      console.error("Failed to initialize storage: ", error);
      setStorageInitError(error.message || "Unknown error");
      setInitializing(false);
    }
  }

  if (initializing) {
    return <CircularProgress/>;
  }

  if (ready) {
    return <App/>;
  }

  return <>
    {
      storageInitError && <Alert severity={ "error" }>Failed to initialize storage: { storageInitError }</Alert>
    }

    {
      !ready && !storageInitError && <Alert severity={ "info" }>Please configure storages</Alert>
    }

    <Box p={ 2 }>
      <StorageConfigView initialConfig={ config } onApply={ applyConfig }/>
    </Box>
  </>;
}


async function initialize(config?: StorageConfig): Promise<boolean> {
  if (!config) {
    config = StorageProviderManager.instance.getStorageConfig();
    if (!config) {
      return false;
    }
  }

  if (!config.local) {
    throw new Error("Local storage is not configured");
  }

  let syncProvider: RemoteSyncProvider | undefined;
  if (config.remote) {
    const remoteStorageProvider = StorageProviderManager.instance.getProvider(config.remote.provider);
    if (!remoteStorageProvider || !remoteStorageProvider.syncFactory) {
      throw new Error("Remote storage is not configured or corresponding sync provider is not supported");
    }

    const valError = await remoteStorageProvider.validateOptions(config.remote.options);
    if (valError) {
      throw new Error("Remote storage configuration is invalid: " + valError);
    }

    syncProvider = remoteStorageProvider.syncFactory(config.remote.options);
  }

  const localStorageProvider = StorageProviderManager.instance.getProvider(config.local.provider);
  if (!localStorageProvider || !localStorageProvider.storageFactory) {
    throw new Error("Local storage is not configured or corresponding storage provider is not supported");
  }

  const valError = await localStorageProvider.validateOptions(config.local.options);
  if (valError) {
    throw new Error("Local storage configuration is invalid: " + valError);
  }

  const backedLocalStorage = localStorageProvider.storageFactory(config.local.options);
  const localStorage = new MemoryCachedStorage(backedLocalStorage);

  StorageProviderManager.instance.setStorageConfig(config);
  ClientWorkspace.init(localStorage, syncProvider);
  FileSettingsProvider.init(localStorage);

  return true;
}
