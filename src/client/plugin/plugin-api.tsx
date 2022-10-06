import ArrowOutwardIcon from "@mui/icons-material/ArrowOutward";
import { StoragePath } from "@storage/storage-path";
import * as React from "react";
import { useMemo } from "react";
import * as router from "react-router-dom";
import { useEditorContext } from "../editor/editor-context";
import { getPlatform, Platform } from "../platform/getPlatform";
import { getFileRoutePath } from "../workspace/routing";


declare global {
  function openExternalLink(url: string): Promise<void>;
}


export function Link(props: React.PropsWithChildren<{ to: string | StoragePath, className?: string }>) {
  const ctx = useEditorContext();
  const path = useMemo(() => {
    let to = props.to;
    if (typeof to === "string") {
      to = to.startsWith("/") ? new StoragePath(to) : ctx.entryPath.child(to);
    }

    return getFileRoutePath(to);
  }, [ props.to, ctx.entryPath ]);

  return <router.Link to={ path } className={ props.className } title={ path }>
    { props.children }
  </router.Link>;
}


export function ExternalLink(props: React.PropsWithChildren<{ href: string, className?: string }>) {
  function open(e: React.MouseEvent) {
    if (getPlatform() === Platform.Electron) {
      e.preventDefault();
      openExternalLink(props.href);
    }
  }

  return <a href={ props.href } target={ "_blank" } className={ props.className } onClick={ open } title={ props.href }>
    <ArrowOutwardIcon style={ { fontSize: "1em" } }/>
    { props.children }
  </a>;
}


export { useCurrentThemeIsDark } from "../Theme";
export { useEditorContext };
