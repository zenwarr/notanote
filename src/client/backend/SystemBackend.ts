import ky from "ky";


export class SystemBackend {
  async getLatestVersion(): Promise<string> {
    return (await ky(`/api/latest-version`).json<{ version: string }>()).version;
  }
}


export class TestSystemBackend implements SystemBackend {
  async getLatestVersion(): Promise<string> {
    return "storybook";
  }
}
