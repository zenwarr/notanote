import express from "express";
import { getStatusCodeForError, isOk, Result } from "../common/errors";


export function writeResult(res: express.Response, r: Result<unknown>) {
  if (!isOk(r)) {
    res.status(getStatusCodeForError(r.error)).send(r);
    return;
  } else {
    res.send(r.value);
  }
}
