import { Button } from "@mui/material";
import { makeStyles } from "@mui/styles";
import { EntryCompareData } from "@sync/EntryCompareData";
import { isCleanLocalDiff, isCleanRemoteDiff, isConflictingDiff, SyncDiffType } from "@sync/LocalSyncWorker";
import { ReactNode, useCallback } from "react";
import { useLoad } from "../useLoad";
import { LoadGuard } from "../utils/LoadGuard";


export type DiffCompareProps = {
  diffType: SyncDiffType | undefined;
  data: EntryCompareData;
  onAcceptLocal?: () => void;
  onAcceptRemote?: () => void;
}


export function DiffCompare(props: DiffCompareProps) {
  const classes = useStyles();
  const local = getText(props.data.local);
  const remote = getText(props.data.remote);

  let originalIsLocal = true;
  let originalTitle: ReactNode = "", modifiedTitle: ReactNode = "";
  if (!props.diffType || isConflictingDiff(props.diffType)) {
    originalTitle = <span>
      Local &nbsp;
      <Button variant={ "outlined" } size={ "small" } onClick={ props.onAcceptLocal }>
        Accept
      </Button>
    </span>;
    modifiedTitle = <span>
      Remote &nbsp;
      <Button variant={ "outlined" } size={ "small" } onClick={ props.onAcceptRemote }>
        Accept
      </Button>
    </span>;
    originalIsLocal = false;
  } else if (props.diffType && isCleanLocalDiff(props.diffType)) {
    originalTitle = "Original (remote)";
    modifiedTitle = "Modified (local)";
    originalIsLocal = false;
  } else if (props.diffType && isCleanRemoteDiff(props.diffType)) {
    originalTitle = "Original (local)";
    modifiedTitle = "Modified (remote)";
  }

  const diffEditor = useLoad(useCallback(() => import("../monaco/MonacoDiff"), []));

  if (local === false || remote === false) {
    return <div>
      Cannot compare: one of entries is not a text file (utf-8 is invalid)
    </div>;
  }

  return <LoadGuard loadState={ diffEditor } render={ diffEditor => <diffEditor.MonacoDiff className={ classes.editor }
                                                                                           original={ originalIsLocal ? local : remote }
                                                                                           modified={ originalIsLocal ? remote : local }
                                                                                           originalTitle={ originalTitle }
                                                                                           modifiedTitle={ modifiedTitle }/> }/>;
}


// try to decode buffer as utf-8 string, and return undefined if it fails
function getText(data: Buffer | undefined): string | false | undefined {
  if (!data) {
    return undefined;
  }

  try {
    return data.toString("utf-8");
  } catch (e) {
    return false;
  }
}


const useStyles = makeStyles(theme => ({
  editor: {
    minHeight: 400,
    flexGrow: 1
  }
}));
