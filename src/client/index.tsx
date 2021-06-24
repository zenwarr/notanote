import * as ReactDOM from "react-dom";
import { App } from "./App";
import { configure } from "mobx";
import { CssBaseline } from "@material-ui/core";


configure({
  enforceActions: "never"
});


ReactDOM.render(<>
  <CssBaseline />
  <App/>
</>, document.getElementById("root"));

