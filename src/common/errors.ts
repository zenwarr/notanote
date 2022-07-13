export enum ErrorCode {
  InvalidRequestParams = "INVALID_REQUEST_PARAMS",
  NotFound = "NOT_FOUND",
  AlreadyExists = "ALREADY_EXISTS",
  Internal = "INTERNAL"
}


export function getStatusCodeForError(code: ErrorCode) {
  switch (code) {
    case ErrorCode.InvalidRequestParams:
    case ErrorCode.AlreadyExists:
      return 400;

    case ErrorCode.NotFound:
      return 404;

    case ErrorCode.Internal:
      return 500;
  }

  return 500;
}


export class LogicError extends Error {
  constructor(code: ErrorCode, public text: string) {
    super(text);
    this.code = code;
  }

  readonly code: ErrorCode;
}
