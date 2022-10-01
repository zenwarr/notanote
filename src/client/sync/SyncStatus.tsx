import { Box, Button, Tooltip } from "@mui/material";
import { observer } from "mobx-react-lite";
import { Workspace } from "../Workspace";
import { SyncStatusIcon, SyncStatusIconColor } from "./SyncStatusIcon";
import { formatRelative } from "date-fns";


export interface SyncStatusProps {
  onClick?: () => void;
}


export const SyncStatus = observer((props: SyncStatusProps) => {
  const sync = Workspace.instance.sync;
  const jobs = Workspace.instance.syncJobRunner;

  if (!sync || !jobs) {
    return null;
  }

  let color: SyncStatusIconColor = !jobs.errors.length ? "success" : "error";
  let syncDate = jobs.lastSuccessfulJobDone ? formatRelative(jobs.lastSuccessfulJobDone, new Date()) : "Unknown";
  const diffCount = sync.actualDiff.length;

  return <Tooltip title={ "Last sync: " + syncDate } placement={ "bottom-start" }>
    <Button onClick={ props.onClick }>
      <Box display={ "flex" }>
        <SyncStatusIcon color={ color } rotate={ jobs.isWorking }/>

        &nbsp;

        <span>
          { diffCount > 0 ? diffCount : "" }
        </span>
      </Box>
    </Button>
  </Tooltip>;
});
