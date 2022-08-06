import { Button, Stack } from "@mui/material";
import { StoragePath } from "@storage/StoragePath";
import { isConflictingDiff, SyncDiffType } from "@sync/LocalSyncWorker";
import { SyncDiffEntry } from "@sync/SyncDiffEntry";
import { ClientWorkspace } from "../ClientWorkspace";


export type DiffTreePanelProps = {
  diff: SyncDiffEntry[];
  selected: string | undefined;
}


export function DiffTreePanel(props: DiffTreePanelProps) {
  const isDisabled = props.selected == null;
  const d = props.diff.find(diff => diff.path.normalized === props.selected);
  const showDiff = d && isConflictingDiff(d.diff);

  async function accept(remote: boolean) {
    if (!props.selected) {
      return;
    }

    let path = new StoragePath(props.selected);
    await ClientWorkspace.instance.acceptChanges(path, props.diff, remote);
  }

  return <Stack spacing={ 2 } direction={ "row" }>
    <Button variant={ "contained" } disabled={ isDisabled } onClick={ () => accept(false) }>
      Accept local
    </Button>

    <Button variant={ "contained" } disabled={ isDisabled } onClick={ () => accept(true) }>
      Accept remote
    </Button>

    {
      showDiff && <Button variant={ "contained" }>
        Show diff
      </Button>
    }
  </Stack>;
}
