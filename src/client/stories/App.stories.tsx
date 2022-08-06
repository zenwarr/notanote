import { StoragePath } from "@storage/StoragePath";
import { getContentIdentityForData } from "@sync/ContentIdentity";
import { DiffType } from "@sync/DiffType";
import { App } from "../App";
import { AudioRecord } from "../audio/AudioRecord";
import { DeviceConfigEditor } from "../device/DeviceConfigEditor";
import { Palette } from "../Palette";
import { SyncStatusIcon } from "../sync/SyncStatusIcon";
import { demoCompleter } from "./demo";


export default { title: "App" };

export const def = () => <App/>;

export const palette = () => <Palette open completer={ demoCompleter } onSelect={ console.log }/>;

export const audio = () => <AudioRecord/>;

export const device = () => <DeviceConfigEditor/>;
