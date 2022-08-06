import SyncProblemIcon from "@mui/icons-material/SyncProblem";
import { makeStyles } from "@mui/styles";
import { StoragePath } from "@storage/StoragePath";
import { isConflictingDiff, SyncDiffType } from "@sync/LocalSyncWorker";
import { SyncDiffEntry } from "@sync/SyncDiffEntry";
import cn from "classnames";


export type DiffTreeNodeProps = {
  path: StoragePath;
  diff: SyncDiffEntry | undefined;
}


export function DiffTreeNode(props: DiffTreeNodeProps) {
  const classes = useStyles();

  const d = props.diff;
  const isNew = d && d.actual != null && d.syncMetadata?.synced == null;
  const isUpdated = d && d.actual != null && d.syncMetadata?.synced != null && d.syncMetadata.synced !== d.actual;
  const isRemoved = d && d.actual == null && d.syncMetadata?.synced != null;
  const isAccepted = d && d.syncMetadata?.accepted === d.actual;
  const isConflict = d && isConflictingDiff(d.diff);

  const className = cn({
    [classes.new]: isNew,
    [classes.updated]: isUpdated,
    [classes.removed]: isRemoved,
    [classes.accepted]: isAccepted
  });

  return <span className={ className }>
    { props.path.isEqual(StoragePath.root) ? "<root>" : props.path.basename }

    {
      isConflict && <span>
        <SyncProblemIcon color={ "error" } className={ classes.conflictIcon }/>
        <span className={ classes.conflictText }>
          { getConflictText(d?.diff) }
        </span>
      </span>
    }
  </span>;
}


const useStyles = makeStyles(theme => ({
  new: {
    color: "green"
  },
  updated: {
    color: "blue"
  },
  removed: {
    color: "gray"
  },
  accepted: {
    opacity: 0.5
  },
  conflictIcon: {
    verticalAlign: "middle",
    marginLeft: theme.spacing(0.5)
  },
  conflictText: {
    marginLeft: theme.spacing(0.5)
  }
}));


function getConflictText(diff: SyncDiffType | undefined): string | undefined {
  switch (diff) {
    case SyncDiffType.ConflictingUpdate:
      return "Updated remotely";
    case SyncDiffType.ConflictingCreate:
      return "Created remotely";
    case SyncDiffType.ConflictingLocalRemove:
      return "Updated remotely";
    case SyncDiffType.ConflictingRemoteRemove:
      return "Removed remotely";
    default:
      return undefined;
  }
}
