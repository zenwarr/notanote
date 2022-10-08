export async function showVersion() {
  const version = require("../../package.json").version;
  alert(`Client application version: ${ version }`);
}
