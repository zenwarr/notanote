import { StoragePath } from "@storage/storage-path";
import { SyncDiffType } from "@sync/sync-diff-type";
import { useCallback } from "react";
import { Workspace } from "../workspace/workspace";
import { useLoad } from "../useLoad";
import { LoadGuard } from "../utils/LoadGuard";
import { DiffCompare } from "./DiffCompare";


export type DiffCompareLoaderProps = {
  path: StoragePath | undefined;
  diffType: SyncDiffType | undefined;
  onAcceptLocal?: () => void;
  onAcceptRemote?: () => void;
}


export function DiffCompareLoader(props: DiffCompareLoaderProps) {
  const data = useLoad(useCallback(async () => {
    if (!props.path || !Workspace.instance.sync) {
      return undefined;
    }

    return Workspace.instance.sync.getCompareData(props.path);
  }, [ props.path ]));

  return <LoadGuard loadState={ data }>
    { data => data ? <DiffCompare diffType={ props.diffType }
                                  onAcceptLocal={ props.onAcceptLocal }
                                  onAcceptRemote={ props.onAcceptRemote }
                                  data={ data }/> : null }
  </LoadGuard>
}
