import { StoragePath } from "@storage/storage-path";
import * as mobx from "mobx-react-lite";
import { formatRelative } from "date-fns";
import { Workspace } from "../workspace/Workspace";
import { Grid, Box, Paper, Typography, Stack, Button, CircularProgress } from "@mui/material";
import { DiffTree } from "./DiffTree";
import { SyncJobs } from "./SyncJobs";


export const SyncPanel = mobx.observer(() => {
  const jobs = Workspace.instance.syncJobRunner;
  const sw = Workspace.instance.sync;

  if (!jobs || !sw) {
    return null;
  }

  const syncDate = jobs.lastSuccessfulJobDone ? formatRelative(jobs.lastSuccessfulJobDone, new Date()) : "Unknown";

  return <Box>
    <Box display={ "flex" } justifyContent={ "space-between" } alignItems={ "center" } mb={ 1 }>
      <span>
        Last successful sync: { syncDate } &nbsp;

        {
            sw.updatingDiff && <CircularProgress size={ 10 }/>
        }
      </span>

      <Button variant={ "outlined" } size={ "small" } onClick={ () => sw.updateDiff(StoragePath.root) } disabled={ sw.updatingDiff }>
        Update diff
      </Button>
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
        </Paper>
      </Grid>
    </Grid>
  </Box>;
});
