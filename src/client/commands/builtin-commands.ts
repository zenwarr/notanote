import { Command } from "./command-manager";
import { reloadEditor } from "./editor";
import { initGithub, pushGithub } from "./github";
import { showVersion } from "./version";


export const COMMANDS: Command[] = [
  {
    name: "version.show",
    description: "Show version",
    action: showVersion
  },
  {
    name: "github.init",
    description: "Init GitHub integration",
    action: initGithub
  },
  {
    name: "github.push",
    description: "Push changes to GitHub",
    action: pushGithub
  },
  {
    name: "editor.reload",
    description: "Reloads current editor, updating changed plugin if necessary",
    action: reloadEditor
  }
];
