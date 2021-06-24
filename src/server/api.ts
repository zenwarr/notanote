import { ensureLoggedIn, getProfile } from "./auth";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import express from "express";
import { WorkspaceEntry } from "../common/WorkspaceEntry";


const WORKSPACES_DIR = process.env["WORKSPACES_DIR"] ?? "/workspaces";


const IGNORED_ENTRIES: string[] = [
  ".git",
  ".idea",
  "node_modules"
];


async function buildEntries(dir: string, rootDir: string): Promise<WorkspaceEntry[]> {
  const result: WorkspaceEntry[] = [];

  for (const entry of await fs.promises.readdir(dir)) {
    if (IGNORED_ENTRIES.includes(entry)) {
      continue;
    }

    const fullPath = path.join(dir, entry);
    const stats = await fs.promises.stat(fullPath);

    const wEntry: WorkspaceEntry = {
      id: path.relative(rootDir, fullPath),
      name: entry,
      type: stats.isDirectory() ? "dir" : "file"
    };
    result.push(wEntry);

    if (stats.isDirectory()) {
      wEntry.children = await buildEntries(fullPath, rootDir);
    }
  }

  return result;
}

function getWorkspaceDir(workspaceId: string): string {
  return path.join(WORKSPACES_DIR, workspaceId);
}


export function initApi(app: express.Application) {
  app.get("/api/workspaces/:workspaceID/tree", ensureLoggedIn, async (req, res) => {
    const entries = await buildEntries(getWorkspaceDir(req.params.workspaceID!), getWorkspaceDir(req.params.workspaceID!));
    res.send(entries);
  });

  app.post("/api/workspaces/:workspaceID/files", ensureLoggedIn, async (req, res) => {
    const parent: string = req.body.parent || "";
    const name: string | undefined = req.body.name;
    const type: string = req.body.type;

    if (path.isAbsolute(parent)) {
      res.status(400).send({
        error: "Invalid path: should be relative"
      });
      return;
    }

    if (type === "dir" && !name) {
      res.status(400).send({
        error: "Invalid parameters: name should be provided when creating a dir"
      });
      return;
    }

    const workspaceDir = getWorkspaceDir(req.params.workspaceID!);
    let createdEntryPath: string;
    if (type === "dir") {
      createdEntryPath = path.join(workspaceDir, parent, name!);
      await fs.promises.mkdir(createdEntryPath, {
        recursive: true
      });
    } else {
      await fs.promises.mkdir(path.join(workspaceDir, parent), {
        recursive: true
      });

      const generatedFileName = randomUUID() + ".md";
      createdEntryPath = path.join(workspaceDir, parent, generatedFileName);
      await fs.promises.writeFile(path.join(workspaceDir, parent, generatedFileName), "", "utf-8");
    }

    const entries = await buildEntries(workspaceDir, workspaceDir);
    res.send({
      path: path.relative(workspaceDir, createdEntryPath),
      entries
    });
  });

  app.get("/api/workspaces/:workspaceID/files/:fileID", ensureLoggedIn, async (req, res) => {
    const filePath = path.join(getWorkspaceDir(req.params.workspaceID!), decodeURIComponent(req.params["fileID"]!));

    const stat = await fs.promises.stat(filePath);
    if (stat.isDirectory()) {
      res.status(400).send({
        error: "File is a directory"
      });
      return;
    }

    let content: string | undefined;
    try {
      content = await fs.promises.readFile(filePath, "utf-8");
    } catch (error) {
      if (error.code === "ENOENT") {
        res.status(404).send({
          error: "File not found"
        });
        return;
      } else {
        throw error;
      }
    }

    res.send({
      content
    });
  });

  app.put("/api/workspaces/:workspaceID/files/:fileID", ensureLoggedIn, async (req, res) => {
    const filePath = path.join(getWorkspaceDir(req.params.workspaceID!), decodeURIComponent(req.params["fileID"]!));

    const stat = await fs.promises.stat(filePath);
    if (stat.isDirectory()) {
      res.status(400).send({
        error: "File is a directory"
      });
      return;
    }

    await fs.promises.writeFile(filePath, req.body.content, "utf-8");

    res.status(200).send({});
  });

  app.get("/", ensureLoggedIn, (req, res) => {
    const profile = getProfile(req);
    res.render("index", {
      userName: profile.name
    });
  });
}
