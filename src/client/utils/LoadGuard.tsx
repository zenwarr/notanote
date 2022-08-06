import { CircularProgress } from "@mui/material";
import { makeStyles } from "@mui/styles";
import * as React from "react";
import { LoadState } from "../useLoad";


export type LoadGuardProps<T> = {
  loadState: LoadState<T>;
  data: (data: T) => React.ReactNode;
  errorFormat?: (err: string) => React.ReactNode;
}


export function LoadGuard<T>(props: LoadGuardProps<T>) {
  const classes = useStyles();

  if (props.loadState.loadError) {
    return <div className={ classes.error }>
      {
        props.errorFormat ? props.errorFormat(props.loadState.loadError) : "Error: " + props.loadState.loadError
      }
    </div>;
  }

  if (!props.loadState.isLoaded) {
    return <div className={ classes.loader }>
      <CircularProgress/>
    </div>;
  }

  return <>
    { props.data(props.loadState.data) }
  </>;
}


const useStyles = makeStyles(theme => ({
  loader: {
    padding: theme.spacing(2),
    display: "flex",
    justifyContent: "center"
  },

  error: {
    padding: theme.spacing(2),
    display: "flex",
    color: theme.palette.error.main,
    justifyContent: "center"
  }
}));
