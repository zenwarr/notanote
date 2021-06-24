import { Backend } from "./Backend";
import { TestWorkspaceBackend, WorkspaceBackend } from "./WorkspaceBackend";


export function initTestBackend() {
  Backend.register(WorkspaceBackend, TestWorkspaceBackend);
}
