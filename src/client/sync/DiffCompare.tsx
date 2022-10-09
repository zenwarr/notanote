import { makeStyles } from "@mui/styles";
import { EntryCompareData } from "@sync/entry-compare-data";
import { SyncDiffType } from "@sync/sync-diff-type";
import { useCallback } from "react";
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

  const diffEditor = useLoad(useCallback(() => import("../monaco/MonacoDiff"), []));

  if (local === false || remote === false) {
    return <div>
      Cannot compare: one of entries is not a text file (utf-8 is invalid)
    </div>;
  }

  return <LoadGuard loadState={ diffEditor }>
    { diffEditor => <diffEditor.MonacoDiff className={ classes.editor }
                                           original={ local }
                                           modified={ remote }
                                           originalTitle={ "Local" }
                                           modifiedTitle={ "Remote" }/> }
  </LoadGuard>
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
