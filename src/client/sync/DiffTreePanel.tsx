import { Button, Stack } from "@mui/material";
import { StoragePath } from "@storage/StoragePath";
import { SyncDiffEntry } from "@sync/SyncDiffEntry";
import { useState } from "react";
import { ClientWorkspace } from "../ClientWorkspace";
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

  async function accept() {
    if (!props.selectedPath) {
      return;
    }

    await ClientWorkspace.instance.acceptChanges(props.selectedPath, props.allDiffs);
  }

  return <>
    <Stack spacing={ 2 } direction={ "row" }>
      <Button variant={ "contained" } disabled={ isDisabled } onClick={ () => accept() }>
        Accept
      </Button>

      <Button variant={ "contained" } disabled={ isDisabled } onClick={ () => setDiffModalActive(true) }>
        Show diff
      </Button>
    </Stack>

    <FullScreenDialog title={ `Diff: ${ props.selectedPath?.normalized }` } open={ diffModalActive }
                      onClose={ () => setDiffModalActive(false) }>
      <DiffCompareLoader path={ props.selectedPath } diffType={ d?.diff }/>
    </FullScreenDialog>
  </>;
}
