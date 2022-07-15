import * as mobx from "mobx-react-lite";
import { formatRelative } from "date-fns";
import { ClientWorkspace } from "../ClientWorkspace";
import { Box, Grid } from "@mui/material";


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

    <Grid container>
      <Grid item xs={ 6 }>
        <h2>Pending roots</h2>

        <ul>
          {
            sw.pendingRoots.map(r => <li key={ r.path.normalized }>
              { r.path.normalized }
            </li>)
          }
        </ul>
      </Grid>
    </Grid>
  </Box>;
});
