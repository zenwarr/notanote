import { observer } from "mobx-react-lite";
import { CommandManager } from "./command-manager";
import { makeStyles } from "@mui/styles";


export const CommandStatus = observer(() => {
  const runningOperations = CommandManager.instance.operations.size;
  const classes = useStyles();

  return <div className={ classes.text }>
    {
      runningOperations ? `${ runningOperations } ${ getPlural(runningOperations, "operation") }...` : null
    }
  </div>;
});


function getPlural(operations: number, text: string) {
  return operations === 1 ? text : text + "s";
}


const useStyles = makeStyles(theme => ({
  text: {
    whiteSpace: "nowrap"
  }
}));
