import * as mobx from "mobx";
import { Backend } from "../backend/Backend";
import { SystemBackend } from "../backend/SystemBackend";
import { WorkspaceBackend } from "../backend/WorkspaceBackend";
import { WorkspaceManager } from "../WorkspaceManager";
import { PaletteOption } from "../Palette";
import * as nanoid from "nanoid";


export interface Command {
  name: string;
  description: string;
  action: () => Promise<void>;
}


const COMMANDS: Command[] = [
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


export interface Operation {
  command: string;
  startedAt: Date;
}


export class CommandManager {
  private constructor() {
    mobx.makeAutoObservable(this);
  }


  static instance = new CommandManager();

  static commands = COMMANDS;


  operations = new Map<string, Operation>();


  isCommandRunning(name: string) {
    for (const op of this.operations.values()) {
      if (op.command === name) {
        return true;
      }
    }

    return false;
  }


  async run(command: string) {
    const cmd = CommandManager.commands.find(c => c.name === command);

    if (cmd) {
      return this.runAction(command, cmd.action);
    } else {
      alert(`command ${ command } not found`);
    }
  }


  async runAction(name: string, action: () => Promise<void>): Promise<void> {
    const operationId = nanoid.nanoid();
    this.operations.set(operationId, {
      startedAt: new Date(),
      command: name
    });

    try {
      await action();
    } catch (err: any) {
      alert(`Failed to run command ${ name }: ${ err.message }`);
    } finally {
      this.operations.delete(operationId);
    }
  }
}


export function commandPaletteCompleter(value: string): PaletteOption[] {
  return COMMANDS.filter(c => c.name.includes(value)).map(c => ({
    value: c.name,
    content: "/" + c.name,
    description: c.description
  }));
}
