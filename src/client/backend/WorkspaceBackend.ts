import ky from "ky";
import { timeout } from "../../common/utils/timeout";


export class WorkspaceBackend {
  async initGithub(storageId: string, email: string, remote: string): Promise<void> {
    await ky.post(`/api/storages/${ storageId }/github/init`, {
      json: {
        email,
        remote
      }
    }).json();
  }


  async githubPush(storageId: string): Promise<void> {
    await ky.post(`/api/storages/${storageId}/github/push`).json();
  }
}


export class TestWorkspaceBackend implements WorkspaceBackend {
  async initGithub(storageId: string, email: string, remote: string): Promise<void> {
    console.log("init github", email, remote);
  }


  async githubPush(storageId: string): Promise<void> {
    await timeout(3000);
    console.log("github push");
  }
}
