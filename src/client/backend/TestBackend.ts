import { Backend } from "./Backend";
import { TestWorkspaceBackend, WorkspaceBackend } from "./WorkspaceBackend";
import { SystemBackend, TestSystemBackend } from "./SystemBackend";
import { PluginBackend, TestPluginBackend } from "./PluginBackend";


export function initTestBackend() {
  Backend.register(WorkspaceBackend, TestWorkspaceBackend);
  Backend.register(SystemBackend, TestSystemBackend);
  Backend.register(PluginBackend, TestPluginBackend);
}
