import { Box, Button } from "@mui/material";
import { makeStyles } from "@mui/styles";
import { observer } from "mobx-react-lite";
import { Workspace } from "../workspace/workspace";
import { SyncStatusIcon, SyncStatusIconColor } from "./SyncStatusIcon";
import PriorityHighIcon from "@mui/icons-material/PriorityHigh";


export interface SyncStatusConnectedProps {
  onClick?: () => void;
}


export const SyncStatusConnected = observer((props: SyncStatusConnectedProps) => {
  const sync = Workspace.instance.sync;
  const jobs = Workspace.instance.syncJobRunner;

  if (!sync || !jobs) {
    return null;
  }

  const unresolvedDiffCount = sync.unresolvedDiffCount;
  const conflictCount = sync.conflictCount;

  return <SyncStatus isError={ jobs.errors.length > 0 }
                     cleanDiffCount={ unresolvedDiffCount }
                     conflictCount={ conflictCount }
                     isWorking={ jobs.isWorking || sync.updatingDiff }
                     onClick={ props.onClick }/>;
});


export type SyncStatusProps = SyncStatusConnectedProps & {
  isError: boolean;
  cleanDiffCount: number;
  conflictCount: number;
  isWorking: boolean;
}


export function SyncStatus(props: SyncStatusProps) {
  let color: SyncStatusIconColor = !props.isError ? "success" : "error";
  const classes = useStyles();

  return <Button onClick={ props.onClick } className={ classes.button }>
    <Box display={ "flex" }>
      <SyncStatusIcon color={ color } rotate={ props.isWorking }/>

      &nbsp;

      { props.cleanDiffCount > 0 ? props.cleanDiffCount : "" }

      {
          props.conflictCount > 0 && <span>
          &nbsp;
          <PriorityHighIcon color={ "error" } className={ classes.conflictIcon }/>
            { props.conflictCount }
        </span>
      }
    </Box>
  </Button>;
}


const useStyles = makeStyles(theme => ({
  button: {
    textAlign: "left",
    justifyContent: "flex-start",
    color: "inherit"
  },
  conflictIcon: {
    fontSize: "1em",
    verticalAlign: "-0.1em",
  }
}));
