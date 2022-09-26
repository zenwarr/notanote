const fs = require("fs");
const path = require("path")

const parentVersion = require(path.join(__dirname, "../package.json")).version;

let childPackagePath = path.join(__dirname, "package.json");
const manifest = require(childPackagePath);
manifest.version = parentVersion;
fs.writeFileSync(childPackagePath, JSON.stringify(manifest, null, 2));
