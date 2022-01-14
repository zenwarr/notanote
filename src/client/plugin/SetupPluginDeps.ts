import * as React from "react";
import * as ReactJsx from "react/jsx-runtime"
import * as mobx from "mobx";
import * as mobxReactLite from "mobx-react-lite";
import * as dateFns from "date-fns";
import * as materialUi from "@mui/material";
import * as csv from "csv";


export function setupPluginDeps() {
  (window as any).React = React;
  (window as any).ReactJsx = ReactJsx;
  (window as any).Mobx = mobx;
  (window as any).MobxReactLite = mobxReactLite;
  (window as any).DateFns = dateFns;
  (window as any).MaterialUI = materialUi;
  (window as any).CSV = csv;
}
