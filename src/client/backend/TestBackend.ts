import { Backend } from "./Backend";
import { TestWorkspaceBackend, WorkspaceBackend } from "./WorkspaceBackend";
import { SystemBackend, TestSystemBackend } from "./SystemBackend";


export function initTestBackend() {
  Backend.register(WorkspaceBackend, TestWorkspaceBackend);
  Backend.register(SystemBackend, TestSystemBackend);
}
