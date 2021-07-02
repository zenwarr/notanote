import * as ReactDOM from "react-dom";
import { App } from "./App";
import { configure } from "mobx";
import { CssBaseline } from "@material-ui/core";
import { WorkspaceManager } from "./WorkspaceManager";
import { ProfileManager } from "./ProfileManager";


if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch(err => {
    console.error("failed to install service worker", err);
  });
}


configure({
  enforceActions: "never"
});


const root = document.getElementById("root");
const params = JSON.parse(root?.dataset.params ?? "{}");

WorkspaceManager.instance.id = params.workspaceId;
ProfileManager.instance.userName = params.userName;

ReactDOM.render(<>
  <CssBaseline/>
  <App/>
</>, root);
