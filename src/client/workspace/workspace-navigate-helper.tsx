import { useEffect } from "react";
import { useNavigate } from "react-router";
import { Workspace } from "./workspace";


export function WorkspaceNavigateHelper() {
  const navigate = useNavigate();

  useEffect(() => {
    Workspace.instance.setNavigator(p => navigate(p));

    return () => Workspace.instance.setNavigator(undefined);
  }, [ ]);

  return null;
}
