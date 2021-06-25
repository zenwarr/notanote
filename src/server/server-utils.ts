import { FastifyReply } from "fastify";
import { getStatusCodeForError, isOk, Result } from "../common/errors";


export function writeResult(res: FastifyReply, r: Result<unknown>): unknown {
  if (!isOk(r)) {
    res.status(getStatusCodeForError(r.error));
    return r ?? {};
  } else {
    return r.value ?? {};
  }
}
