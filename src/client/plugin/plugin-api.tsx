import ArrowOutwardIcon from "@mui/icons-material/ArrowOutward";
import { StoragePath } from "@storage/storage-path";
import * as React from "react";
import { useMemo } from "react";
import * as router from "react-router-dom";
import { useEditorContext } from "../editor/editor-context";
import { getPlatform, Platform } from "../platform/get-platform";
import { getFileRoutePath } from "../workspace/routing";


export function Link(props: React.PropsWithChildren<{ to: string | StoragePath, className?: string }>) {
  const ctx = useEditorContext();
  const { path, title } = useMemo(() => {
    let to = props.to;
    if (typeof to === "string") {
      to = to.startsWith("/") ? new StoragePath(to) : ctx.entryPath.parentDir.child(to);
    }

    return { path: getFileRoutePath(to), title: to.normalized }
  }, [ props.to, ctx.entryPath ]);

  return <router.Link to={ path } className={ props.className } title={ title }>
    { props.children }
  </router.Link>;
}


export function ExternalLink(props: React.PropsWithChildren<{ href: string, className?: string }>) {
  function open(e: React.MouseEvent) {
    if (getPlatform() === Platform.Electron) {
      e.preventDefault();
      electronUtils.openExternalLink(props.href);
    }
  }

  return <a href={ props.href } target={ "_blank" } className={ props.className } onClick={ open } title={ props.href }>
    <ArrowOutwardIcon style={ { fontSize: "1em" } }/>
    { props.children }
  </a>;
}


export { useCurrentThemeIsDark } from "../Theme";
export { useEditorContext };
