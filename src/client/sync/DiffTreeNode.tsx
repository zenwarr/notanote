import { makeStyles } from "@mui/styles";
import { StoragePath } from "@storage/storage-path";
import { isAcceptedStateLost, isActionable, SyncDiffEntry } from "@sync/SyncDiffEntry";
import { isCleanRemoteDiff, isConflictingDiff, SyncDiffType } from "@sync/SyncDiffType";
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

  const actionable = d && isActionable(d);
  const lost = d && isAcceptedStateLost(d);

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

  return <span>
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
        actionable &&
      <Tooltip title={ lost ? "Change is accepted, but the state was lost" : "Change is accepted and is going to be applied soon" }>
        <CheckIcon color={ lost ? "error" : "success" } className={ classes.acceptIcon }/>
      </Tooltip>
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
    case SyncDiffType.ConflictingCreate:
      return "Updated both remotely and locally";
    case SyncDiffType.ConflictingLocalRemove:
      return "Updated remotely, but removed locally";
    case SyncDiffType.ConflictingRemoteRemove:
      return "Removed remotely, but updated locally";
    default:
      return undefined;
  }
}
