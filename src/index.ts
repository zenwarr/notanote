import dotenv from "dotenv";
import * as path from "path";


const envFilePath = process.env["ENV_FILE"] ?? path.join(__dirname, ".env");
dotenv.config({
  path: envFilePath
});


import { startApp } from "./server/server";


startApp();
