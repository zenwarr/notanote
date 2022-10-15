import { Backend } from "./backend";
import { TestWorkspaceBackend, WorkspaceBackend } from "./workspace-backend";


export function initTestBackend() {
  Backend.register(WorkspaceBackend, TestWorkspaceBackend);
}
