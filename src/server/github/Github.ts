import { SpecialEntry, Workspace } from "../../common/storage/Workspace";
import child_process from "child_process";
import path from "path";
import assert from "assert";
import { fileExists } from "../storage/fsUtils";


export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  command: string;
}


export interface RunCommandOptions {
  ignoreExitCode?: boolean;
  cwd?: string;
  env?: { [name: string]: string };
}


async function runCommand(bin: string, args: string[], options?: RunCommandOptions): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    let proc = child_process.spawn(bin, args, {
      stdio: "pipe",
      cwd: options?.cwd,
      env: {
        ...process.env,
        ...options?.env
      }
    } as const);

    let stdout = "";
    let stderr = "";

    if (proc.stdout) {
      proc.stdout.on("data", text => {
        stdout += text.toString();
      });
    }

    if (proc.stderr) {
      proc.stderr.on("data", text => {
        stderr += text.toString();
      });
    }

    proc.on("close", code => {
      const result: CommandResult = { stderr, stdout, exitCode: code ?? 0, command: `${ bin } ${ args.join(" ") }` };

      if (code === 0 || options?.ignoreExitCode === true) {
        resolve(result);
      } else {
        const error: any = new Error(`Process exited with code ${ code }`);
        error.result = result;
        reject(error);
      }
    });

    proc.on("error", error => {
      reject(error);
    });
  });
}


export async function initGithubIntegration(ws: Workspace, userEmail: string, remote: string) {
  let privateKeyPath = await getPrivateKeyPathAndEnsureParentExists(ws);

  if (!await fileExists(privateKeyPath)) {
    await runCommand("ssh-keygen", [ "-t", "ed25519", "-C", userEmail, "-f", privateKeyPath, "-N", "" ]);
  }

  const wsDir = ws.root;
  if (!await isGitRepositoryRoot(wsDir)) {
    await runCommand("git", [ "init" ], {
      cwd: wsDir
    });

    await runCommand("git", [ "config", "--add", "core.sshCommand", `ssh -i ${ privateKeyPath }` ], {
      cwd: wsDir
    });

    await runCommand("git", [ "config", "user.email", userEmail ], {
      cwd: wsDir
    });

    await runCommand("git", [ "config", "user.name", "notanote" ], {
      cwd: wsDir
    });

    await runCommand("git", [ "remote", "add", "origin", remote ], {
      cwd: wsDir
    });

    await runCommand("git", [ "add", "." ], {
      cwd: wsDir
    });

    await runCommand("git", [ "commit", "-m", "initial commit" ], {
      cwd: wsDir
    });
  }
}


export async function commitAndPushChanges(ws: Workspace, commitName: string | undefined, checkForChanges: boolean): Promise<void> {
  if (!checkForChanges || await repositoryHasChanges(ws)) {
    const wsDir = ws.root;
    await runCommand("git", [ "add", "." ], {
      cwd: wsDir
    });

    await runCommand("git", [ "commit", "-m", commitName || generateCommitName() ], {
      cwd: wsDir
    });

    await runCommand("git", [ "push", "-u", "origin", "master" ], {
      cwd: wsDir
    });
  }
}


function generateCommitName(): string {
  return `sync: ${ (new Date().toISOString()) }`;
}


async function repositoryHasChanges(ws: Workspace) {
  const wsDir = ws.root;
  const result = await runCommand("git", [ "diff-index", "--quiet", "--exit-code", "HEAD" ], {
    cwd: wsDir,
    ignoreExitCode: true
  });
  if (result.exitCode === 0) {
    return false;
  } else if (result.exitCode === 1) {
    return true;
  } else {
    throw new Error(`Failed to check if repository has changes: ${ result.stderr } `);
  }
}


async function isGitRepositoryRoot(checkDir: string): Promise<boolean> {
  try {
    const result = await runCommand("git", [ "rev-parse", "--show-toplevel" ], {
      cwd: checkDir
    });
    const root = result.stdout.trim();
    return root === checkDir;
  } catch (err) {
    return false;
  }
}


async function getPrivateKeyPathAndEnsureParentExists(ws: Workspace): Promise<string> {
  const p = await getPrivateKeyPath(ws);
  assert(p != null);
  return p;
}


async function getPrivateKeyPath(ws: Workspace): Promise<string | undefined> {
  await ws.ensureDirExists(SpecialEntry.Secrets);
  let secretsPath = ws.toAbsolutePath(SpecialEntry.Secrets);
  if (secretsPath) {
    return path.join(secretsPath, "ssh_key");
  } else {
    return undefined;
  }
}


export async function clone(ws: Workspace, url: string, dir: string): Promise<void> {
  const privateKeyPath = await getPrivateKeyPath(ws);
  await runCommand("git", [ "clone", url, dir ], {
    env: privateKeyPath ? {
      GIT_SSH_COMMAND: `ssh -i ${ privateKeyPath } -o IdentitiesOnly=yes`
    } : {}
  });
}


export async function getRemoteOrigin(dir: string): Promise<string | undefined> {
  const result = await runCommand("git", [ "remote", "get-url", "origin" ], {
    cwd: dir,
    ignoreExitCode: true
  });

  if (result.exitCode === 0) {
    return result.stdout.trim();
  } else {
    return undefined;
  }
}


export async function pullChanges(dir: string): Promise<void> {
  await runCommand("git", [ "pull" ], {
    cwd: dir
  });
}
