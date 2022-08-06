import { StoragePath } from "@storage/StoragePath";
import { getContentIdentityForData } from "@sync/ContentIdentity";
import { DiffType, SyncResult } from "@sync/RemoteSync";
import { App } from "../App";
import { AudioRecord } from "../audio/AudioRecord";
import { DeviceConfigEditor } from "../device/DeviceConfigEditor";
import { Palette } from "../Palette";
import { ConflictItem } from "../sync/ConflictItem";
import { SyncStatusIcon } from "../sync/SyncStatusIcon";
import { demoCompleter } from "./demo";


export default { title: "App" };

export const def = () => <App/>;

export const palette = () => <Palette open completer={ demoCompleter } onSelect={ console.log }/>;

export const audio = () => <AudioRecord/>;

export const device = () => <DeviceConfigEditor/>;

const syncResult: SyncResult = {
  path: new StoragePath("/file.txt"),
  conflict: DiffType.ConflictingUpdate,
  data: Buffer.from("Hello world!"),
  identity: getContentIdentityForData(Buffer.from("Hello, world!"))
};
export const conflict = () => <ConflictItem syncResult={ syncResult }/>;

export const syncStatus = () => <div>
  <SyncStatusIcon color={ "success" }/>
  <SyncStatusIcon color={ "success" } rotate/>
  <SyncStatusIcon color={ "error" } rotate/>
</div>;
