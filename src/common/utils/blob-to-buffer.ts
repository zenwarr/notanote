/**
 * Copied from here: https://github.com/feross/blob-to-buffer/blob/master/index.js
 */
export async function blobToBuffer(blob: Blob): Promise<Buffer> {
  const reader = new FileReader();

  return new Promise((resolve, reject) => {
    function onLoadEnd(e: ProgressEvent & { error?: Error }) {
      reader.removeEventListener("loadend", onLoadEnd, false);
      if (e.error) {
        reject(e.error);
      } else {
        resolve(Buffer.from(reader.result as any));
      }
    }

    reader.addEventListener("loadend", onLoadEnd, false);
    reader.readAsArrayBuffer(blob);
  });
}
