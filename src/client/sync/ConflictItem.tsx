import { Box, Button } from "@mui/material";
import { ConflictResolveMethod } from "@sync/LocalSync";
import { DiffType, SyncResult } from "@sync/RemoteSync";
import { useState } from "react";
import { ClientWorkspace } from "../ClientWorkspace";
import { FullScreenDialog } from "../utils/FullScreenDialog";
import { ConflictDiff } from "./ConflictDiff";


export type ConflictItemProps = {
  syncResult: SyncResult;
}


function getConflictDesc(confict: DiffType) {
  switch (confict) {
    case DiffType.ConflictingUpdate:
      return "Conflicting update on both sides";
    case DiffType.ConflictingCreate:
      return "Conflicting create on both sides";
    case DiffType.ConflictingRemoteRemove:
      return "Removed on remote while changed locally";
    case DiffType.ConflictingLocalRemove:
      return "Removed locally while remote has changed";
    default:
      return "Unknown";
  }
}


export function ConflictItem(props: ConflictItemProps) {
  const conflict = "conflict" in props.syncResult ? props.syncResult.conflict : undefined;
  const [ showDiff, setShowDiff ] = useState(false);

  function acceptLocal() {
    return ClientWorkspace.instance.syncWorker.resolveConflict(props.syncResult, ConflictResolveMethod.AcceptLocal);
  }

  function acceptRemote() {
    return ClientWorkspace.instance.syncWorker.resolveConflict(props.syncResult, ConflictResolveMethod.AcceptRemote);
  }

  if (!conflict) {
    return <></>;
  }

  return <div>
    <strong>{ props.syncResult.path.normalized }</strong>: { getConflictDesc(conflict) }

    {
        (conflict === DiffType.ConflictingCreate || conflict === DiffType.ConflictingUpdate) && <Box>
        <Button onClick={ () => setShowDiff(true) }>
          Compare
        </Button>

        <Button onClick={ acceptLocal }>
          Accept local
        </Button>

        <Button onClick={ acceptRemote }>
          Accept remote
        </Button>
      </Box>
    }

    {
        conflict === DiffType.ConflictingRemoteRemove && <Box>
        <Button onClick={ () => setShowDiff(true) }>
          Compare
        </Button>

        <Button onClick={ acceptLocal }>
          Remove locally
        </Button>

        <Button onClick={ acceptRemote }>
          Create on remote
        </Button>
      </Box>
    }

    {
        conflict === DiffType.ConflictingLocalRemove && <Box>
        <Button onClick={ () => setShowDiff(true) }>
          Compare
        </Button>

        <Button onClick={ acceptLocal }>
          Remove remotely
        </Button>

        <Button onClick={ acceptRemote }>
          Create on local
        </Button>
      </Box>
    }

    {
      <FullScreenDialog open={ showDiff } onClose={ () => setShowDiff(false) } title={"Compare"}>
        <ConflictDiff syncResult={ props.syncResult }/>
      </FullScreenDialog>
    }
  </div>;
}
