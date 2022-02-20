import { SpecialWorkspaceEntry } from "../../common/workspace/Workspace";
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


export async function runCommand(bin: string, args: string[], options?: RunCommandOptions): Promise<CommandResult> {
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


export async function initGithubIntegration(root: string, userEmail: string, remote: string) {
  let privateKeyPath = await getPrivateKeyPathAndEnsureParentExists(root);

  if (!await fileExists(privateKeyPath)) {
    await runCommand("ssh-keygen", [ "-t", "ed25519", "-C", userEmail, "-f", privateKeyPath, "-N", "" ]);
  }

  if (!await isGitRepositoryRoot(root)) {
    await runCommand("git", [ "init" ], {
      cwd: root
    });

    await runCommand("git", [ "config", "--add", "core.sshCommand", `ssh -i ${ privateKeyPath }` ], {
      cwd: root
    });

    await runCommand("git", [ "config", "user.email", userEmail ], {
      cwd: root
    });

    await runCommand("git", [ "config", "user.name", "notanote" ], {
      cwd: root
    });

    await runCommand("git", [ "remote", "add", "origin", remote ], {
      cwd: root
    });

    await runCommand("git", [ "add", "." ], {
      cwd: root
    });

    await runCommand("git", [ "commit", "-m", "initial commit" ], {
      cwd: root
    });
  }
}


export async function commitAndPushChanges(root: string, commitName: string | undefined, checkForChanges: boolean): Promise<void> {
  if (!checkForChanges || await repositoryHasChanges(root)) {
    await runCommand("git", [ "add", "." ], {
      cwd: root
    });

    await runCommand("git", [ "commit", "-m", commitName || generateCommitName() ], {
      cwd: root
    });

    await runCommand("git", [ "push", "-u", "origin", "master" ], {
      cwd: root
    });
  }
}


function generateCommitName(): string {
  return `sync: ${ (new Date().toISOString()) }`;
}


async function repositoryHasChanges(root: string) {
  const result = await runCommand("git", [ "diff-index", "--quiet", "--exit-code", "HEAD" ], {
    cwd: root,
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


async function getPrivateKeyPathAndEnsureParentExists(root: string): Promise<string> {
  const p = await getPrivateKeyPath(root);
  assert(p != null);
  return p;
}


async function getPrivateKeyPath(root: string): Promise<string | undefined> {
  const secretsPath = path.join(root, SpecialWorkspaceEntry.Secrets.normalized);
  if (secretsPath) {
    return path.join(secretsPath, "ssh_key");
  } else {
    return undefined;
  }
}


export async function clone(root: string, url: string, dir: string): Promise<void> {
  const privateKeyPath = await getPrivateKeyPath(root);
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
