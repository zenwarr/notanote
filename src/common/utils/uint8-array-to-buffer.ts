/**
 * Copied from here: https://github.com/feross/typedarray-to-buffer/blob/master/index.js
 */
export function uint8ArrayToBuffer(arr: Uint8Array): Buffer {
  return ArrayBuffer.isView(arr)
      // To avoid a copy, use the typed array's underlying ArrayBuffer to back
      // new Buffer, respecting the "view", i.e. byteOffset and byteLength
      ? Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength)
      // Pass through all other types to `Buffer.from`
      : Buffer.from(arr)
}
