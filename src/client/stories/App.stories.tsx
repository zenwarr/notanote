import { App } from "../App";
import { AudioRecord } from "../audio/AudioRecord";
import { Palette } from "../Palette";
import { SyncStatusIcon } from "../sync/SyncStatusIcon";
import { demoCompleter } from "./demo";
import { DeviceConfigEditor } from "../device/DeviceConfigEditor";


export default { title: "App" };

export const def = () => <App/>;

export const palette = () => <Palette open completer={ demoCompleter } onSelect={ console.log }/>;

export const audio = () => <AudioRecord/>;

export const device = () => <DeviceConfigEditor />;

export const syncStatus = () => <div>
  <SyncStatusIcon color={"success"} />
  <SyncStatusIcon color={"success" } rotate />
  <SyncStatusIcon color={"error"} rotate />
</div>
