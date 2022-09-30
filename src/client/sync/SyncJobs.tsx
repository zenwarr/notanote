import { Dialog } from "@mui/material";
import { SyncJobRunnerError } from "@sync/test/SyncJobRunner";
import * as mobx from "mobx-react-lite";
import { useState } from "react";
import { Workspace } from "../Workspace";
import { ErrorDisplay } from "../error-boundary/ErrorDisplay";


export type SyncJobsProps = {}


export const SyncJobs = mobx.observer((props: SyncJobsProps) => {
  const runner = Workspace.instance.syncJobRunner;
  const [ openError, setOpenError ] = useState<SyncJobRunnerError | undefined>();

  if (!runner) {
    return null;
  }

  return <>
    <ul>
      {
        runner.runningJobs.map(job => <li key={ job.path.normalized }>
          {
            job.path.normalized
          }
        </li>)
      }
    </ul>

    <ul>
      {
        runner.errors.map(error => <li key={ error.path.normalized } onClick={ () => setOpenError(error) }>
          { error.path.normalized }: { error.error.message }
        </li>)
      }
    </ul>

    <Dialog open={ openError != null } onClose={ () => setOpenError(undefined) } sx={ { padding: 0 } }>
      <ErrorDisplay error={ openError?.error }/>
    </Dialog>
  </>;
});
