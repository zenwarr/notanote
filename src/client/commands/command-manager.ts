import * as mobx from "mobx";
import * as nanoid from "nanoid";
import { PaletteOption } from "../palette/palette";
import { COMMANDS } from "./builtin-commands";


export interface Command {
  name: string;
  description: string;
  action: () => Promise<void>;
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
