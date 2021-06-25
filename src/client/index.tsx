import * as ReactDOM from "react-dom";
import { App } from "./App";
import { configure } from "mobx";
import { CssBaseline } from "@material-ui/core";
import { WorkspaceManager } from "./WorkspaceManager";


configure({
  enforceActions: "never"
});


const root = document.getElementById("root");
const params = JSON.parse(root?.dataset.params ?? "{}");

WorkspaceManager.instance.id = params.workspaceId;

ReactDOM.render(<>
  <CssBaseline/>
  <App/>
</>, root);
