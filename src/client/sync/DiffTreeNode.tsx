import { makeStyles } from "@mui/styles";
import { StoragePath } from "@storage/StoragePath";
import { isConflictingDiff, SyncDiffType, isCleanRemoteDiff } from "@sync/Sync";
import { SyncDiffEntry } from "@sync/SyncDiffEntry";
import cn from "classnames";
import DownloadIcon from "@mui/icons-material/Download";
import VerticalAlignCenterIcon from "@mui/icons-material/VerticalAlignCenter";
import CheckIcon from "@mui/icons-material/Check";
import { Tooltip } from "@mui/material";


export type DiffTreeNodeProps = {
  path: StoragePath;
  diff: SyncDiffEntry | undefined;
}


export function DiffTreeNode(props: DiffTreeNodeProps) {
  const classes = useStyles();

  const d = props.diff;

  const isAccepted = d && d.syncMetadata?.accepted === d.actual && !(d.syncMetadata?.accepted == null && d.actual == null);

  const itemClassName = cn({
    [classes.new]: d && (d.diff === SyncDiffType.LocalCreate || d.diff === SyncDiffType.ConflictingCreate),
    [classes.updated]: d && (d.diff === SyncDiffType.LocalUpdate || d.diff === SyncDiffType.ConflictingUpdate || d.diff === SyncDiffType.ConflictingRemoteRemove),
    [classes.removed]: d && (d.diff === SyncDiffType.LocalRemove || d.diff === SyncDiffType.ConflictingLocalRemove),
    [classes.missing]: d && d.actual == null && !(d.diff === SyncDiffType.LocalRemove || d.diff === SyncDiffType.ConflictingLocalRemove)
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

  return <Tooltip title={ <pre>{ JSON.stringify(d, undefined, 2) }</pre> }>
    <span>
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

      {
          isAccepted && <Tooltip title={ "Change is accepted and is going to be applied soon" }>
          <CheckIcon color={ "success" } className={ classes.acceptIcon }/>
        </Tooltip>
      }
    </span>
  </Tooltip>;
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
  missing: {
    color: "gray"
  },
  icon: {
    verticalAlign: "middle",
    marginLeft: theme.spacing(0.5)
  },
  acceptIcon: {
    verticalAlign: "middle",
    marginLeft: theme.spacing(0.5),
    fontSize: 12
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
