import { Dialog, Input, List, ListItem, ListItemText, makeStyles, TextField } from "@material-ui/core";
import * as React from "react";
import { createRef, useEffect, useLayoutEffect, useState } from "react";


export interface PaletteOption {
  value: string;
  content: React.ReactNode;
}


export type PaletteProps = {
  open: boolean;
  onClose?: () => void;
  completer?: (value: string) => PaletteOption[];
  onSelect?: (value: string) => void;
}


export function Palette(props: PaletteProps) {
  const classes = useStyles();
  const [ inputValue, setInputValue ] = useState("");
  const [ selectedOption, setSelectedOption ] = useState<string | undefined>(undefined);
  const listRef = createRef<HTMLUListElement>();

  useEffect(() => {
    setInputValue("");
  }, [ props.open ]);

  function setSelectedOptionAndScroll(value: string | undefined) {
    setSelectedOption(value);

    if (value == null) {
      return;
    }

    const index = options.findIndex(x => x.value === value);
    const pos = index * 46;
    if (index >= 0 && listRef.current && !(pos >= listRef.current.scrollTop && pos < listRef.current.scrollTop + listRef.current.clientHeight)) {
      listRef.current.scrollTo(0, 46 * index - 3 * 46);
    }
  }

  const options = props.completer?.(inputValue) || [];
  if (selectedOption != null && !options.some(x => x.value === selectedOption)) {
    setSelectedOptionAndScroll(undefined);
  }

  function onKeyPress(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      const selectedIndex = options.findIndex(x => x.value === selectedOption);
      if (selectedIndex < 0 || selectedIndex + 1 >= options.length) {
        if (options.length !== 0) {
          setSelectedOptionAndScroll(options[0].value);
        }
      } else {
        setSelectedOptionAndScroll(options[selectedIndex + 1].value);
      }

      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      const selectedIndex = options.findIndex(x => x.value === selectedOption);
      if (selectedIndex <= 0) {
        if (options.length !== 0) {
          setSelectedOptionAndScroll(options[options.length - 1].value);
        }
      } else {
        setSelectedOptionAndScroll(options[selectedIndex - 1].value);
      }

      e.preventDefault();
    } else if (e.key === "Enter") {
      if (selectedOption != null) {
        props.onSelect?.(selectedOption);
      } else if (options.length > 0) {
        props.onSelect?.(options[0].value);
      }

      e.preventDefault();
    }
  }

  function onSelect(value: string) {
    props.onSelect?.(value);
    setSelectedOption(value);
  }

  return <Dialog open={ props.open } classes={ { paper: classes.dialogPaper } }>
    <Input autoFocus className={ classes.input } onBlur={ props.onClose } value={ inputValue }
           inputProps={ { onKeyDown: onKeyPress } }
           onChange={ e => setInputValue(e.target.value) }/>

    {
      options.length > 0 && <List className={ classes.list } ref={ listRef }>
        {
          options?.map(option => <ListItem onClick={ () => onSelect(option.value) } key={ option.value } button
                                           selected={ option.value === selectedOption }>
            <ListItemText>
              { option.content }
            </ListItemText>
          </ListItem>)
        }
      </List>
    }
  </Dialog>;
}


const useStyles = makeStyles(theme => ({
  input: {
    padding: theme.spacing(2),
    width: 500,
    maxWidth: "80vw"
  },
  dialogPaper: {
    position: "absolute",
    top: 100
  },
  list: {
    maxHeight: "300px",
    overflowY: "auto"
  }
}));
