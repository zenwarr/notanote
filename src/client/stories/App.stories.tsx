import { Stack } from "@mui/material";
import { StoragePath } from "@storage/StoragePath";
import { SyncDiffType } from "@sync/LocalSyncWorker";
import { SyncDiffEntry } from "@sync/SyncDiffEntry";
import { DiffAction } from "@sync/SyncMetadataStorage";
import { App } from "../App";
import { AudioRecord } from "../audio/AudioRecord";
import { DeviceConfigEditor } from "../device/DeviceConfigEditor";
import { ErrorDisplay } from "../error-boundary/ErrorDisplay";
import { Palette } from "../palette/Palette";
import { DiffTreeNode } from "../sync/DiffTreeNode";
import { demoCompleter } from "./demo";


export default { title: "App" };

export const def = () => <App/>;

export const palette = () => <Palette open completer={ demoCompleter } onSelect={ console.log }/>;

export const audio = () => <AudioRecord/>;

export const device = () => <DeviceConfigEditor/>;

export const error = () => <ErrorDisplay error={ new Error("Something bad") }/>;

function createDiff(diff: SyncDiffType, accepted = false): SyncDiffEntry {
  return {
    path: new StoragePath("demo"),
    diff,
    actual: "actual",
    remote: "remote",
    syncMetadata: {
      synced: "synced",
      accepted: accepted ? "actual" : "accepted",
      action: accepted ? DiffAction.Accept : undefined,
      diff
    }
  };
}

export const diff = () => <Stack direction={ "row" } spacing={ 2 }>
  <Stack p={ 2 } spacing={ 2 }>
    <DiffTreeNode path={ new StoragePath("demo") } diff={ createDiff(SyncDiffType.LocalCreate) }/>

    <DiffTreeNode path={ new StoragePath("demo") } diff={ createDiff(SyncDiffType.LocalUpdate) }/>

    <DiffTreeNode path={ new StoragePath("demo") } diff={ createDiff(SyncDiffType.LocalRemove) }/>

    <DiffTreeNode path={ new StoragePath("demo") } diff={ createDiff(SyncDiffType.RemoteCreate) }/>

    <DiffTreeNode path={ new StoragePath("demo") } diff={ createDiff(SyncDiffType.RemoteUpdate) }/>

    <DiffTreeNode path={ new StoragePath("demo") } diff={ createDiff(SyncDiffType.RemoteRemove) }/>

    <DiffTreeNode path={ new StoragePath("demo") } diff={ createDiff(SyncDiffType.ConflictingCreate) }/>

    <DiffTreeNode path={ new StoragePath("demo") } diff={ createDiff(SyncDiffType.ConflictingUpdate) }/>

    <DiffTreeNode path={ new StoragePath("demo") } diff={ createDiff(SyncDiffType.ConflictingLocalRemove) }/>

    <DiffTreeNode path={ new StoragePath("demo") } diff={ createDiff(SyncDiffType.ConflictingRemoteRemove) }/>
  </Stack>

  <Stack p={ 2 } spacing={ 2 }>
    <DiffTreeNode path={ new StoragePath("demo") } diff={ createDiff(SyncDiffType.LocalCreate, true) }/>

    <DiffTreeNode path={ new StoragePath("demo") } diff={ createDiff(SyncDiffType.LocalUpdate, true) }/>

    <DiffTreeNode path={ new StoragePath("demo") } diff={ createDiff(SyncDiffType.LocalRemove, true) }/>

    <DiffTreeNode path={ new StoragePath("demo") } diff={ createDiff(SyncDiffType.RemoteCreate, true) }/>

    <DiffTreeNode path={ new StoragePath("demo") } diff={ createDiff(SyncDiffType.RemoteUpdate, true) }/>

    <DiffTreeNode path={ new StoragePath("demo") } diff={ createDiff(SyncDiffType.RemoteRemove, true) }/>

    <DiffTreeNode path={ new StoragePath("demo") } diff={ createDiff(SyncDiffType.ConflictingCreate, true) }/>

    <DiffTreeNode path={ new StoragePath("demo") } diff={ createDiff(SyncDiffType.ConflictingUpdate, true) }/>

    <DiffTreeNode path={ new StoragePath("demo") } diff={ createDiff(SyncDiffType.ConflictingLocalRemove, true) }/>

    <DiffTreeNode path={ new StoragePath("demo") } diff={ createDiff(SyncDiffType.ConflictingRemoteRemove, true) }/>
  </Stack>
</Stack>;
