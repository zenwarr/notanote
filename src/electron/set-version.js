const fs = require("fs");

const parentVersion = require("../package.json").version;

const manifest = require("package.json");
manifest.version = parentVersion;
fs.writeFileSync("package.json", JSON.stringify(manifest, null, 2));
