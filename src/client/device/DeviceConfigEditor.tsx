import { Button, Grid } from "@mui/material";
import { useCallback, useState } from "react";
import { BrowserFileStorageLayer } from "../storage/BrowserFileStorage";
import { useLoad } from "../useLoad";
import { observer } from "mobx-react-lite";


const SAVED_BROWSER_FS_ROOT = "saved-browser-fs-root";


export const DeviceConfigEditor = observer(() => {
  const [ browserStorage, setBrowserStorage ] = useState<BrowserFileStorageLayer | undefined>();

  const savedStorage = useLoad(
      useCallback(
          async () => BrowserFileStorageLayer.fromSavedHandle(SAVED_BROWSER_FS_ROOT),
          []
      )
  );

  async function onRequestFileAccess() {
    const storage = await BrowserFileStorageLayer.requestFromUser();
    if (storage) {
      setBrowserStorage(storage);
      await storage.saveHandle(SAVED_BROWSER_FS_ROOT);
    }
  }

  const storage = browserStorage || savedStorage.data;

  if (!savedStorage.isLoaded) {
    return <div>Loading...</div>;
  }

  return <Grid container spacing={ 2 }>
    <Grid item sm={ 6 }>
      { `Remote storage: ${ document.location.origin }` }
    </Grid>

    <Grid item sm={ 6 }>
      {
        storage ? `Local storage selected` : `No local storage selected`
      }

      {
        <div>
          <Button onClick={ onRequestFileAccess } variant={ "contained" }>
            Request file system access
          </Button>
        </div>
      }

      {
        storage && storage.isLocked() && <div>
          <Button onClick={ () => storage?.unlock() } variant={ "contained" }>
            Unlock
          </Button>
        </div>
      }
    </Grid>
  </Grid>;
});
