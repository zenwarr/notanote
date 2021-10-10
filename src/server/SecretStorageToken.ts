import jwt from "jsonwebtoken";
import assert from "assert";
import path from "path";
import fs from "fs";
import crypto from "crypto";


export interface SecretStorageTokenPayload {
  user: string;
  ws: string;
}


let CACHED_PRIVATE_KEY: string | undefined = undefined;

function getPrivateKey(): string {
  if (CACHED_PRIVATE_KEY) {
    return CACHED_PRIVATE_KEY;
  }

  const configDir = process.env["CONFIG_DIR"];
  if (!configDir) {
    throw new Error("failed to initialize session support: CONFIG_DIR env not set");
  }

  const secretFilePath = path.join(configDir, "secret_storage_key");
  if (fs.existsSync(secretFilePath)) {
    CACHED_PRIVATE_KEY = fs.readFileSync(secretFilePath, "utf-8");
    return CACHED_PRIVATE_KEY;
  }

  CACHED_PRIVATE_KEY = crypto.randomBytes(48).toString("hex");
  fs.writeFileSync(secretFilePath, CACHED_PRIVATE_KEY, "utf-8");

  return CACHED_PRIVATE_KEY;
}


export function createSecretStorageToken(payload: SecretStorageTokenPayload): string {
  return jwt.sign(payload, getPrivateKey(), {
    expiresIn: "15m",
    algorithm: "HS256"
  });
}


export function decodeSecretStorageToken(token: string): SecretStorageTokenPayload | undefined {
  const payload = jwt.verify(token, getPrivateKey(), {
    algorithms: [ "HS256" ]
  });
  assert(payload != null && typeof payload === "object");
  return payload as SecretStorageTokenPayload;
}
