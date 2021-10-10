import { App } from "../App";
import { Palette } from "../Palette";
import { demoCompleter } from "./demo";

export default { title: "App" };

export const def = () => <App/>;

export const palette = () => <Palette open completer={ demoCompleter } onSelect={ console.log }/>;
