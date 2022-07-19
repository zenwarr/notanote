import { Box, Button } from "@mui/material";
import { DiffType, SyncResult } from "../../common/sync/RemoteSync";


export type ConflictItemProps = {
  syncResult: SyncResult;
}


export function ConflictItem(props: ConflictItemProps) {
  if (!("conflict" in props.syncResult)) {
    return <></>;
  }

  return <div>
    { props.syncResult.path }

    {
      (props.syncResult.conflict === DiffType.ConflictingCreate || props.syncResult.conflict === DiffType.ConflictingUpdate) && <Box>
        <Button>
          Accept local
        </Button>

        <Button>
          Accept remote
        </Button>
      </Box>
    }

    {
        props.syncResult.conflict === DiffType.ConflictingRemoteRemove && <Box>
        <Button>
          Remove locally
        </Button>

        <Button>
          Create on remote
        </Button>
      </Box>
    }

    {
        props.syncResult.conflict === DiffType.ConflictingLocalRemove && <Box>
        <Button>
          Remove remotely
        </Button>

        <Button>
          Create on local
        </Button>
      </Box>
    }
  </div>;
}
