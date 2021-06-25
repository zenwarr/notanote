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


export type ErrorResult = {
  error: ErrorCode;
  text: string;
}


export type OkResult<T> = {
  value: T;
}


export type Result<T> = ErrorResult | OkResult<T>;


export function isOk<T>(r: Result<T>): r is OkResult<T> {
  return !("error" in r);
}
