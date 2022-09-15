import { makeStyles } from "@mui/styles";
import { EntryCompareData } from "@sync/EntryCompareData";
import { isCleanLocalDiff, isCleanRemoteDiff, isConflictingDiff, SyncDiffType } from "@sync/LocalSyncWorker";
import { useCallback } from "react";
import { useLoad } from "../useLoad";
import { LoadGuard } from "../utils/LoadGuard";


export type DiffCompareProps = {
  diffType: SyncDiffType | undefined;
  data: EntryCompareData;
}


export function DiffCompare(props: DiffCompareProps) {
  const classes = useStyles();
  const local = getText(props.data.local);
  const remote = getText(props.data.remote);

  let originalIsLocal = true;
  let originalTitle = "", modifiedTitle = "";
  if (!props.diffType || isConflictingDiff(props.diffType)) {
    originalTitle = "Local";
    modifiedTitle = "Remote";
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
