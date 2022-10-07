declare global {
  interface ElectronUtils {
    chooseDirectory(): Promise<{ cancelled: boolean, filePaths: string[] }>;

    openExternalLink(url: string): Promise<void>;
  }

  const electronUtils: ElectronUtils;
}

export {};
