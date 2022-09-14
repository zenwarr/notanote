import { makeStyles } from "@mui/styles";
import { StoragePath } from "@storage/StoragePath";
import { isConflictingDiff, SyncDiffType, isCleanRemoteDiff } from "@sync/LocalSyncWorker";
import { SyncDiffEntry } from "@sync/SyncDiffEntry";
import cn from "classnames";
import DownloadIcon from '@mui/icons-material/Download';
import VerticalAlignCenterIcon from '@mui/icons-material/VerticalAlignCenter';


export type DiffTreeNodeProps = {
  path: StoragePath;
  diff: SyncDiffEntry | undefined;
}


export function DiffTreeNode(props: DiffTreeNodeProps) {
  const classes = useStyles();

  const d = props.diff;

  const containerClassName = cn({
    [classes.accepted]: d && d.syncMetadata?.accepted === d.actual
  });

  const itemClassName = cn({
    [classes.new]: d && (d.diff === SyncDiffType.LocalCreate || d.diff === SyncDiffType.ConflictingCreate),
    [classes.updated]: d && (d.diff === SyncDiffType.LocalUpdate || d.diff === SyncDiffType.ConflictingUpdate || d.diff === SyncDiffType.ConflictingRemoteRemove),
    [classes.removed]: d && (d.diff === SyncDiffType.LocalRemove || d.diff === SyncDiffType.ConflictingLocalRemove)
  });

  const isCleanRemote = d && isCleanRemoteDiff(d.diff);
  const remoteIconClassName = cn(classes.icon, {
    [classes.new]: d && d.diff === SyncDiffType.RemoteCreate,
    [classes.updated]: d && d.diff === SyncDiffType.RemoteUpdate,
    [classes.removed]: d && d.diff === SyncDiffType.RemoteRemove
  });

  const isConflict = d && isConflictingDiff(d.diff);
  const conflictTextClass = cn({
    [classes.new]: d && d.diff === SyncDiffType.ConflictingCreate,
    [classes.updated]: d && (d.diff === SyncDiffType.ConflictingUpdate || d.diff === SyncDiffType.ConflictingLocalRemove),
    [classes.removed]: d && d.diff === SyncDiffType.ConflictingRemoteRemove
  });

  return <span className={ containerClassName }>
    <span className={ itemClassName }>
      { props.path.isEqual(StoragePath.root) ? "<root>" : props.path.basename }
    </span>

    {
      isCleanRemote && <span>
        <DownloadIcon className={ remoteIconClassName }/>
      </span>
    }

    {
      isConflict && <span>
        <VerticalAlignCenterIcon color={ "error" } className={ classes.icon }/>
        <span className={ conflictTextClass }>
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
    color: "#7b7bff"
  },
  removed: {
    color: "#ff6565"
  },
  accepted: {
    opacity: 0.5
  },
  icon: {
    verticalAlign: "middle",
    marginLeft: theme.spacing(0.5),
    marginRight: theme.spacing(0.5)
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
