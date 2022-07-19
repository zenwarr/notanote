import * as mobx from "mobx-react-lite";
import { formatRelative } from "date-fns";
import { ClientWorkspace } from "../ClientWorkspace";
import { Box, Grid, Paper, Typography } from "@mui/material";
import { ConflictItem } from "./ConflictItem";


export const SyncPanel = mobx.observer(() => {
  const sw = ClientWorkspace.instance.syncWorker;

  const syncDate = sw.lastSyncDate ? formatRelative(sw.lastSyncDate, new Date()) : "Unknown";

  return <Box>
    <Box display={ "flex" } justifyContent={ "space-between" } mb={ 2 }>
      <Box>
        Last successful sync: { syncDate }
      </Box>

      <Box>
        {
          sw.lastSyncOk ? "Last sync attempt: successful" : `Last sync attempt: error (${ sw.lastSyncError })`
        }
      </Box>
    </Box>

    <Grid container spacing={ 2 }>
      <Grid item xs={ 6 }>
        <Paper sx={ { p: 2 } }>
          <Typography variant={ "h5" }>Pending roots</Typography>

          {
            sw.pendingRoots.map(r => <div key={ r.path.normalized }>
              { r.path.normalized }
            </div>)
          }
        </Paper>
      </Grid>

      <Grid item xs={ 6 }>
        <Paper sx={ { p: 2 } }>
          <Typography variant={ "h5" }>Conflicts</Typography>

          <div>
            {
              sw.pendingConflicts.map(r => <ConflictItem key={ r.syncResult.path } syncResult={ r.syncResult }/>)
            }
          </div>
        </Paper>
      </Grid>
    </Grid>

    <Paper sx={ { p: 2, mt: 2 } }>
      <Typography variant={ "h5" }>Errors</Typography>

      {
        sw.syncErrors.map(r => <div key={ r.ts.valueOf() }>
          { r.ts.toLocaleString() }: { r.text }
        </div>)
      }
    </Paper>
  </Box>;
});
