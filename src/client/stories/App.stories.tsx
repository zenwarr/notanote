import { App } from "../App";
import { AudioRecord } from "../audio/AudioRecord";
import { DeviceConfigEditor } from "../device/DeviceConfigEditor";
import { ErrorDisplay } from "../error-boundary/ErrorDisplay";
import { Palette } from "../Palette";
import { demoCompleter } from "./demo";


export default { title: "App" };

export const def = () => <App/>;

export const palette = () => <Palette open completer={ demoCompleter } onSelect={ console.log }/>;

export const audio = () => <AudioRecord/>;

export const device = () => <DeviceConfigEditor/>;

export const error = () => <ErrorDisplay error={new Error("Something bad")} />
