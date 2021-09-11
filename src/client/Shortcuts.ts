import { useEffect } from "react";
import { PaletteMode, togglePalette } from "./PaletteProvider";
import { SystemBackend } from "./backend/SystemBackend";
import { Backend } from "./backend/Backend";
import ky from "ky";
import { WorkspaceBackend } from "./backend/WorkspaceBackend";
import { WorkspaceManager } from "./WorkspaceManager";


function runShortcutAction(e: KeyboardEvent) {
  if (e.code === "KeyP" && e.ctrlKey) {
    e.preventDefault();
    togglePalette(e.altKey ? PaletteMode.Command : PaletteMode.File);
  }
}


export function useShortcuts() {
  useEffect(() => {
    document.addEventListener("keydown", runShortcutAction);

    return () => document.removeEventListener("keydown", runShortcutAction);
  }, []);
}


export interface Command {
  name: string;
  description: string;
  action: () => Promise<void>;
}


export const COMMANDS: Command[] = [
  { name: "theme.set_dark", description: "Set dark theme", action: async () => console.log("set dark theme") },
  { name: "theme.set_light", description: "Set light theme", action: async () => console.log("set light theme") },
  {
    name: "theme.set_follow_system",
    description: "Set theme to follow system dark mode",
    action: async () => console.log("set theme follow system")
  },
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
    name: "github push",
    description: "Push changes to GitHub",
    action: pushGithub
  }
];


async function showVersion() {
  const version = await Backend.get(SystemBackend).getLatestVersion();
  alert(`Your version: ${ process.env.CLIENT_VERSION }\nLatest version: ${ version }`);
}


async function initGithub() {
  const email = prompt("your email", "zenw@yandex.ru");
  if (!email) {
    return;
  }

  const remote = prompt("remote", "git@github.com:zenwarr/notanote-sync-test.git");
  if (!remote) {
    return;
  }

  await Backend.get(WorkspaceBackend).initGithub(WorkspaceManager.instance.id, email, remote);
}


async function pushGithub() {
  await Backend.get(WorkspaceBackend).githubPush(WorkspaceManager.instance.id);
}


export function runCommandInBackground(name: string) {
  const cmd = COMMANDS.find(c => c.name === name);
  if (cmd) {
    cmd.action().catch(err => alert(`Failed to run command ${ name }: ${ err.message }`));
  }
}
