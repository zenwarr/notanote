export enum ErrorCode {
  InvalidRequestParams = "INVALID_REQUEST_PARAMS",
  EntryNotFound = "NOT_FOUND",
  Internal = "INTERNAL"
}


export function getStatusCodeForError(code: ErrorCode) {
  switch (code) {
    case ErrorCode.InvalidRequestParams:
      return 400;

    case ErrorCode.EntryNotFound:
      return 404;

    case ErrorCode.Internal:
      return 500;
  }

  return 500;
}


export class LogicError extends Error {
  constructor(public code: ErrorCode, public text: string) {
    super(text);
  }
}
