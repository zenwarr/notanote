import { StoragePath } from "@storage/StoragePath";
import { SyncDiffType } from "@sync/LocalSyncWorker";
import { useCallback } from "react";
import { ClientWorkspace } from "../ClientWorkspace";
import { useLoad } from "../useLoad";
import { LoadGuard } from "../utils/LoadGuard";
import { DiffCompare } from "./DiffCompare";


export type DiffCompareLoaderProps = {
  path: StoragePath | undefined;
  diffType: SyncDiffType | undefined;
}


export function DiffCompareLoader(props: DiffCompareLoaderProps) {
  const data = useLoad(useCallback(async () => {
    if (!props.path) {
      return undefined;
    }

    return ClientWorkspace.instance.syncWorker.getCompareData(props.path);
  }, [ props.path ]));

  return <LoadGuard loadState={ data } render={ data => data ? <DiffCompare diffType={ props.diffType } data={ data }/> : null }/>;
}
