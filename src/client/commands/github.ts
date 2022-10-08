import { Backend } from "../backend/Backend";
import { WorkspaceBackend } from "../backend/WorkspaceBackend";
import { Workspace } from "../workspace/workspace";


export async function initGithub() {
  const email = prompt("your email", "user@example.com");
  if (!email) {
    return;
  }

  const remote = prompt("remote", "git@github.com:user/repository.git");
  if (!remote) {
    return;
  }

  await Backend.get(WorkspaceBackend).initGithub(Workspace.instance.remoteStorageName, email, remote);
}


export async function pushGithub() {
  await Backend.get(WorkspaceBackend).githubPush(Workspace.instance.remoteStorageName);
}
