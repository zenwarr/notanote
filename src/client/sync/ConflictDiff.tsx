import { Grid, Button, Box } from "@mui/material";
import { StorageError, StorageErrorCode } from "@storage/StorageLayer";
import { StoragePath } from "@storage/StoragePath";
import { SyncResult } from "@sync/RemoteSync";
import { useCallback } from "react";
import { ClientWorkspace } from "../ClientWorkspace";
import { useLoad } from "../useLoad";
import { LoadGuard } from "../utils/LoadGuard";


export type ConflictDiffProps = {
  syncResult: SyncResult;
  onAcceptLocal?: () => void;
  onAcceptRemote?: () => void;
}


async function loadLocalData(path: StoragePath) {
  try {
    return ClientWorkspace.instance.storage.read(path);
  } catch (err: any) {
    if (err instanceof StorageError && err.code === StorageErrorCode.NotExists) {
      return undefined;
    } else {
      throw err;
    }
  }
}


export function ConflictDiff(props: ConflictDiffProps) {
  const localData = useLoad(
      useCallback(
          async () => loadLocalData(props.syncResult.path),
          [ props.syncResult.path ]
      ),
      () => {
      }
  );

  return <Grid container>
    <Grid item md={ 6 }>
      <Box display={ "flex" } justifyContent={ "center" } p={ 1 }>
        <Button onClick={ props.onAcceptLocal }>
          Accept local
        </Button>
      </Box>

      <LoadGuard loadState={ localData } data={ d => <pre>
        { d?.toString() || "" }
      </pre> }/>
    </Grid>

    <Grid item md={ 6 }>
      <Box display={ "flex" } justifyContent={ "center" } p={ 1 }>
        <Button onClick={ props.onAcceptRemote }>
          Accept remote
        </Button>
      </Box>

      <pre>
        { props.syncResult.data?.toString() || "" }
      </pre>
    </Grid>
  </Grid>;
}
