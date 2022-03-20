import { CircularProgress, Dialog, DialogContent, DialogContentText, DialogTitle } from "@mui/material";
import { useLoad } from "../useLoad";
import { useCallback } from "react";
import * as React from "react";
import { format } from "date-fns";
import { StorageEntryPointer } from "../../common/storage/StorageLayer";


export type PropertiesDialogProps = {
  open: boolean;
  onClose?: () => void;
  entry: StorageEntryPointer | undefined;
}


export function PropertiesDialog(props: PropertiesDialogProps) {
  const stats = useLoad(useCallback(async () => {
    if (props.entry) {
      return props.entry.stats();
    } else {
      return undefined;
    }
  }, [ props.entry ]));

  function formatDate(date: number | undefined) {
    return date != null ? format(new Date(date), "yyyy-MMM-dd hh:mm:ss") : "?";
  }

  return <Dialog open={ props.open } onClose={ props.onClose }>
    <DialogContent>
      <DialogContentText>
        <table>
          <tbody>
          <tr>
            <td>Path:</td>
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
                <td>Type:</td>
                <td>{ stats.data.isDirectory ? "directory" : "file" }</td>
              </tr>

              <tr>
                <td>Created:</td>
                <td>{ formatDate(stats.data.createTs) }</td>
              </tr>

              <tr>
                <td>Last modified:</td>
                <td>{ formatDate(stats.data.updateTs) }</td>
              </tr>
            </React.Fragment>
          }
          </tbody>
        </table>
      </DialogContentText>
    </DialogContent>
  </Dialog>;
}
