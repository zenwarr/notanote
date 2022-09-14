import * as mobx from "mobx-react-lite";
import { formatRelative } from "date-fns";
import { ClientWorkspace } from "../ClientWorkspace";
import { Grid, Box, Paper, Typography } from "@mui/material";
import { DiffTree } from "./DiffTree";
import { SyncJobs } from "./SyncJobs";


export const SyncPanel = mobx.observer(() => {
  const jobs = ClientWorkspace.instance.syncJobRunner;
  const sw = ClientWorkspace.instance.syncWorker;

  const syncDate = jobs.lastSuccessfulJobDone ? formatRelative(jobs.lastSuccessfulJobDone, new Date()) : "Unknown";

  return <Box>
    <Box display={ "flex" } justifyContent={ "space-between" } mb={ 1 }>
      Last successful sync: { syncDate }
    </Box>

    <Grid container spacing={ 2 }>
      <Grid item xs={ 12 } md={ 6 }>
        <Paper sx={ { p: 2, mt: 2 } }>
          <Typography mb={ 2 } variant={ "h5" }>Changes</Typography>

          <DiffTree width={ 250 } height={ 1000 } diff={ sw.actualDiff || [] }/>
        </Paper>
      </Grid>

      <Grid item xs={ 12 } md={ 6 }>
        <Paper sx={ { p: 2, mt: 2 } }>
          <Typography mb={ 2 } variant={ "h5" }>Jobs</Typography>

          <SyncJobs/>

          {
            jobs.errors.map(err => <div key={ err.date.valueOf() }>
              { err.date.toLocaleString() }: { err.path.normalized }: { err.error.message }
            </div>)
          }
        </Paper>
      </Grid>
    </Grid>
  </Box>;
});
