import { Button, Stack } from "@mui/material";
import { StoragePath } from "@storage/StoragePath";
import { isConflictingDiff } from "@sync/Sync";
import { SyncDiffEntry } from "@sync/SyncDiffEntry";
import { DiffAction } from "@sync/SyncMetadataStorage";
import { useState } from "react";
import { Workspace } from "../workspace/Workspace";
import { FullScreenDialog } from "../utils/FullScreenDialog";
import { DiffCompareLoader } from "./DiffCompareLoader";


export type DiffTreePanelProps = {
  allDiffs: SyncDiffEntry[];
  selectedPath: StoragePath | undefined;
}


export function DiffTreePanel(props: DiffTreePanelProps) {
  const isDisabled = props.selectedPath == null;
  const [ diffModalActive, setDiffModalActive ] = useState(false);
  const d = props.allDiffs.find(d => props.selectedPath && d.path.isEqual(props.selectedPath));
  const isConflict = d != null && isConflictingDiff(d.diff);

  async function accept() {
    if (!props.selectedPath) {
      return;
    }

    await Workspace.instance.acceptChangeTree(props.selectedPath, props.allDiffs);
  }

  async function resolve(action: DiffAction) {
    if (!props.selectedPath || !d) {
      return;
    }

    setDiffModalActive(false);
    await Workspace.instance.acceptChanges(d, action);
  }

  return <>
    <Stack spacing={ 2 } direction={ "row" }>
      {
        !isConflict && <Button variant={ "outlined" } size={ "small" } disabled={ isDisabled } onClick={ () => accept() }>
          Accept non-conflicting
        </Button>
      }

      {
          isConflict && <>
          <Button variant={ "outlined" } size={ "small" } disabled={ isDisabled } onClick={ () => resolve(DiffAction.AcceptLocal) }>
            Accept local
          </Button>

          <Button variant={ "outlined" } size={ "small" } disabled={ isDisabled } onClick={ () => resolve(DiffAction.AcceptRemote) }>
            Accept remote
          </Button>
        </>
      }

      <Button variant={ "outlined" } size={ "small" } disabled={ isDisabled } onClick={ () => setDiffModalActive(true) }>
        Show diff
      </Button>
    </Stack>

    <FullScreenDialog title={ `Diff: ${ props.selectedPath?.normalized }` } open={ diffModalActive }
                      onClose={ () => setDiffModalActive(false) }>
      <DiffCompareLoader path={ props.selectedPath } diffType={ d?.diff }
                         onAcceptLocal={ () => resolve(DiffAction.AcceptLocal) }
                         onAcceptRemote={ () => resolve(DiffAction.AcceptRemote) }/>
    </FullScreenDialog>
  </>;
}
