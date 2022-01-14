import { useRef } from "react";
import assert from "assert";
import { Document, DocumentEditorStateAdapter } from "../Document";
import * as csv from "csv";
import * as mobx from "mobx";
import { observer } from "mobx-react-lite";
import { differenceInDays, differenceInMinutes, startOfDay, startOfYear } from "date-fns";
import { Box, Button, Grid, TextField } from "@mui/material";
import type { PluginMeta } from "./PluginManager";


function parseCsv(input: string): Promise<string[][]> {
  return new Promise((resolve, reject) => {
    csv.parse(input, {
      columns: false
    }, (err, output) => {
      if (err) {
        reject(err);
      } else {
        resolve(output);
      }
    });
  });
}


interface ColumnSpec {
  type: string;
  label: string;
  multiline?: boolean;
}


interface DiaryEditorOptions {
  columns: ColumnSpec[]
}


export class DiaryEditorStateAdapter implements DocumentEditorStateAdapter {
  constructor(doc: Document) {
    mobx.makeAutoObservable(this);
    this.doc = doc;
    this.options = {
      ...this.doc.settings.editor || {}
    } as any;
    this.currentRowIndex = getTodayRowIndex();
    this.parseDocument(); // runs in background, never throws
  }


  private async parseDocument() {
    this._isParsing = true;
    try {
      this.rows = await parseCsv(this.doc.initialSerializedContent);
    } catch (error: any) {
      this._parseError = error.message ?? "Parse error";
    } finally {
      this._isParsing = false;
    }
  }


  get isParsing() {
    return this._isParsing;
  }


  get parseError() {
    return this._parseError;
  }


  getRow(index: number): string[] | undefined {
    if (!this.rows) {
      return undefined;
    }

    if (index >= this.rows.length || index < 0) {
      return undefined;
    } else {
      return this.rows[index];
    }
  }


  setRow(index: number, data: string[]): void {
    if (!this.rows) {
      return;
    }

    setArrayItemFillingGaps(this.rows, index, data, () => []);
    this.doc.onChanges();
  }


  async serializeContent(): Promise<string> {
    return new Promise((resolve, reject) => {
      csv.stringify(this.rows || [], {
        columns: undefined
      }, (err, output) => {
        if (err) {
          reject(err);
        } else {
          resolve(output);
        }
      });
    });
  }


  get currentRow() {
    return this.getRow(this.currentRowIndex)
  }


  setRowIndex(rowIndex: number) {
    this.currentRowIndex = rowIndex;
  }


  getCurrentRowCellValue(cellIndex: number): string {
    return this.getRow(this.currentRowIndex)?.[cellIndex] || ""
  }


  setCurrentRowCellValue(cellIndex: number, value: string) {
    const currentRow = [ ...this.getRow(this.currentRowIndex) || [] ];
    setArrayItemFillingGaps(currentRow, cellIndex, value, () => "");
    this.setRow(this.currentRowIndex, currentRow);
  }


  private readonly doc: Document;
  readonly options: DiaryEditorOptions;
  private rows: string[][] | undefined;
  private _isParsing: boolean = false;
  private _parseError: string | undefined;
  currentRowIndex: number;
}


function setArrayItemFillingGaps<T>(array: T[], index: number, item: T, filler: () => T) {
  if (index < 0) {
    throw new Error("Index must be positive");
  } else if (index >= array.length) {
    // fill empty rows
    for (let i = array.length; i <= index; i++) {
      array.push(filler());
    }
    array[index] = item;
  } else {
    array[index] = item;
  }
}


export interface DiaryEditorProps {
  doc: Document;
}


export const DiaryEditorPlugin = observer((props: DiaryEditorProps) => {
  const stateAdapter = useRef<DiaryEditorStateAdapter>(props.doc.getEditorStateAdapter() as DiaryEditorStateAdapter);
  assert(stateAdapter.current instanceof DiaryEditorStateAdapter);
  const state = stateAdapter.current;

  return <div>
    <Box mb={ 2 } display={ "flex" } justifyContent={ "center" } alignItems={ "center" }>
      <Button onClick={ () => state.setRowIndex(state.currentRowIndex - 1) }>
        Prev
      </Button>

      <Box width={ "100%" } textAlign={ "center" }>
        For index { state.currentRowIndex }
      </Box>

      <Button onClick={ () => state.setRowIndex(state.currentRowIndex + 1) }>
        Next
      </Button>
    </Box>

    {
      state.isParsing && <span>
        Parsing...
      </span>
    }

    {
      state.parseError && <span>
        Error: { state.parseError }
      </span>
    }

    <Box m={ 2 }>
      <Grid container spacing={ 2 }>
        {
          state.options.columns.map((column, index) => <Grid item xs={6} key={index}>
            <FieldEditor column={ column } value={state.getCurrentRowCellValue(index)} onChange={x => state.setCurrentRowCellValue(index, x)} />
          </Grid>)
        }
      </Grid>
    </Box>
  </div>;
});


function FieldEditor(props: { column: ColumnSpec, value: string, onChange: (value: string) => void }) {
  switch (props.column.type) {
    case "text":
      return <TextField label={ props.column.label }
                multiline={ props.column.multiline }
                rows={props.column.multiline ? 3 : 1}
                value={props.value}
                onChange={e => props.onChange(e.target.value)}
                fullWidth
                />

    default:
      return <span>Field type is unsupported: {props.column.type}</span>
  }
}


function getTodayRowIndex() {
  const now = new Date();
  const startYear = startOfYear(now);
  const daysSinceStartOfYear = differenceInDays(now, startYear) + 1;

  const midnight = startOfDay(now);
  const minutesSinceMidnight = differenceInMinutes(now, midnight);
  if (minutesSinceMidnight < 60 * 4) {
    return daysSinceStartOfYear - 1;
  } else {
    return daysSinceStartOfYear;
  }
}


export const diaryPlugin: PluginMeta = {
  name: "diary",
  load: class DiaryPlugin {
    editors = {
      diary: {
        component: DiaryEditorPlugin,
        stateAdapter: DiaryEditorStateAdapter
      }
    }
  },
  editors: {
    diary: {}
  }
}
