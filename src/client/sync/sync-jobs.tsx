import { Dialog } from "@mui/material";
import { SyncJobRunnerError } from "@sync/sync-job-runner";
import * as mobx from "mobx-react-lite";
import { useState } from "react";
import { Workspace } from "../workspace/workspace";
import { ErrorDisplay } from "../error-boundary/error-display";


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

    {
      runner.errors.length > 0 && <div>Errors:</div>
    }

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
