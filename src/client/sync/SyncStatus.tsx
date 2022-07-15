import { Box, Button, Tooltip } from "@mui/material";
import { observer } from "mobx-react-lite";
import { ClientWorkspace } from "../ClientWorkspace";
import { SyncStatusIcon, SyncStatusIconColor } from "./SyncStatusIcon";
import { formatRelative } from "date-fns";


export interface SyncStatusProps {
  onClick?: () => void;
}


export const SyncStatus = observer((props: SyncStatusProps) => {
  const sw = ClientWorkspace.instance.syncWorker;

  let color: SyncStatusIconColor = sw.lastSyncOk ? "success" : "error";
  if (sw.pendingConflicts.length) {
    color = "warning";
  }

  let syncDate = sw.lastSyncDate ? formatRelative(sw.lastSyncDate, new Date()) : "Unknown";

  return <Tooltip title={ "Last sync: " + syncDate } placement={ "bottom-start" }>
    <Button onClick={ props.onClick }>
      <Box display={ "flex" }>
        <SyncStatusIcon color={ color }
                        rotate={ sw.syncingNow }/>

        <Box ml={ 1 }>
          {
              sw.pendingConflicts.length || ""
          }
        </Box>
      </Box>
    </Button>
  </Tooltip>;
});
