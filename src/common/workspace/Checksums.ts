import * as crypto from "crypto";


export function checksum(data: string) {
  const hash = crypto.createHash("sha1").update(data).digest("hex");
  return `sha1:${ hash }:${ data.length }`;
}
