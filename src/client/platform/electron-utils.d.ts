declare global {
  interface ElectronUtils {
    chooseDirectory(): Promise<{ cancelled: boolean, filePaths: string[] }>;

    openExternalLink(url: string): Promise<void>;

    selfUpdate(): Promise<void>;
  }

  const electronUtils: ElectronUtils;
}

export {};
