import { CircularProgress, Dialog, DialogContent} from "@mui/material";
import { useLoad } from "../useLoad";
import { useCallback } from "react";
import * as React from "react";
import { format } from "date-fns";
import { StorageEntryPointer } from "@storage/EntryStorage";
import { makeStyles } from "@mui/styles";


export type PropertiesDialogProps = {
  open: boolean;
  onClose?: () => void;
  entry: StorageEntryPointer | undefined;
}


export function PropertiesDialog(props: PropertiesDialogProps) {
  const classes = useStyles();

  const stats = useLoad(useCallback(async () => {
    if (props.entry) {
      return props.entry.stats();
    } else {
      return undefined;
    }
  }, [ props.entry ]));

  function formatDate(date: number | undefined) {
    return date != null ? format(new Date(date), "yyyy-MMM-dd HH:mm:ss (OOO)") : "?";
  }

  return <Dialog open={ props.open } onClose={ props.onClose }>
    <DialogContent>
      <table>
        <tbody>
        <tr>
          <th className={ classes.tableHeader }>Path:</th>
          <td>{ props.entry?.path.normalized }</td>
        </tr>

        {
            stats.loading && <tr>
            <td colSpan={ 2 }>
              <CircularProgress/>
            </td>
          </tr>
        }

        {
            stats.data && <React.Fragment>
            <tr>
              <th className={ classes.tableHeader }>Type:</th>
              <td>{ stats.data.isDirectory ? "directory" : "file" }</td>
            </tr>

            <tr>
              <th className={ classes.tableHeader }>Created:</th>
              <td>{ formatDate(stats.data.createTs) }</td>
            </tr>

            <tr>
              <th className={ classes.tableHeader }>Last modified:</th>
              <td>{ formatDate(stats.data.updateTs) }</td>
            </tr>
          </React.Fragment>
        }
        </tbody>
      </table>
    </DialogContent>
  </Dialog>;
}


const useStyles = makeStyles(theme => ({
  tableHeader: {
    textAlign: "left",
    paddingRight: theme.spacing(2),
  }
}));
