import fs from "fs";


export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.promises.stat(filePath);
    return true;
  } catch (err: any) {
    if (err.code === "ENOENT") {
      return false;
    } else {
      throw err;
    }
  }
}
