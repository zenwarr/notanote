import { StoragePath } from "@storage/StoragePath";
import { useMemo } from "react";
import * as router from "react-router-dom";
import * as React from "react";


export function Link(props: React.PropsWithChildren<{ path: string, className?: string }>) {
  const path = useMemo(() => "/f" + new StoragePath(props.path).normalized, [ props.path ]);

  return <router.Link to={ path } className={ props.className }>
    { props.children }
  </router.Link>;
}
