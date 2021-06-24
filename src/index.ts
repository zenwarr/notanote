import * as fs from "fs";
import * as path from "path";
import express from "express";
import { WorkspaceEntry } from "./common/WorkspaceEntry";
import passport from "passport";
import dotenv from "dotenv";
import session from "express-session";
import redis from "redis";
import connectRedis from "connect-redis";
import { Strategy as LocalStrategy } from "passport-local";


const GoogleStrategy = require("passport-google-oauth20").Strategy;


dotenv.config();


interface UserInfo {
  id: string;
  name: string;
}


passport.use("google", new GoogleStrategy({
  clientID: process.env["OAUTH_CLIENT_ID"],
  clientSecret: process.env["OAUTH_SECRET"],
  callbackURL: process.env["OAUTH_REDIRECT_URL"]
}, (accessToken: string, refreshToken: string, profile: any, cb: (err?: Error, user?: UserInfo) => void) => {
  if (profile.id !== process.env["USER_PROFILE_ID"]) {
    cb(new Error("you are not allowed to use this application"));
  } else {
    cb(undefined, { id: profile.id, name: profile.displayName });
  }
}));


passport.use("local", new LocalStrategy({
  usernameField: "password",
  passwordField: "password"
}, (password, _, done) => {
  if (password === process.env["AUTH_PASSWORD"]) {
    done(null, { id: "default", name: "Default user" });
  } else {
    done(new Error("user not found"));
  }
}));


passport.serializeUser((user: any, done) => done(null, user));
passport.deserializeUser((user: any, done) => done(null, user));


const IGNORED_ENTRIES: string[] = [
  ".git",
  ".idea",
  "node_modules"
];


const WORKSPACES_DIR = process.env["WORKSPACES_DIR"] ?? "/workspaces";


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


function ensureLoggedIn(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (req.isAuthenticated()) {
    next();
  } else {
    res.redirect("/auth");
  }
}


const redisClient = redis.createClient({
  host: process.env["REDIS_HOST"]
});
const RedisStore = connectRedis(session);

const app = express();
app.use(express.json());
app.use(express.urlencoded());
app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: "k8WHaL2YsP6uDz7LRhHz9",
  resave: true,
  saveUninitialized: true,
  name: "sess"
}));
app.use(passport.initialize());
app.use(passport.session());
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "hbs");
app.use("/static", express.static("static"));

function getWorkspaceDir(workspaceId: string): string {
  return path.join(WORKSPACES_DIR, workspaceId);
}

app.get("/api/workspaces/:workspaceID/tree", ensureLoggedIn, async (req, res) => {
  const entries = await buildEntries(getWorkspaceDir(req.params.workspaceID!), getWorkspaceDir(req.params.workspaceID!));
  res.send(entries);
});

app.post("/api/workspaces/:workspaceID/files", ensureLoggedIn, async (req, res) => {
  const createPath = req.body.path;
  if (path.isAbsolute(createPath)) {
    res.status(400).send({
      error: "Invalid path: should be relative"
    });
    return;
  }

  const workspaceDir = getWorkspaceDir(req.params.workspaceID!);
  const type = req.body.type;
  if (type === "dir") {
    await fs.promises.mkdir(path.join(workspaceDir, createPath), {
      recursive: true
    });
  } else {
    await fs.promises.mkdir(path.join(workspaceDir, path.dirname(createPath)), {
      recursive: true
    });
    await fs.promises.writeFile(path.join(workspaceDir, createPath), "", "utf-8");
  }

  const entries = await buildEntries(workspaceDir, workspaceDir);
  res.send(entries);
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

function getProfile(req: express.Request): UserInfo {
  return (req.session as any).passport.user;
}

app.get("/", ensureLoggedIn, (req, res) => {
  const profile = getProfile(req);
  res.render("index", {
    userName: profile.name
  });
});

app.get("/auth", (req, res) => {
  return res.render("auth");
});

app.post("/auth/code", passport.authenticate("local", {
  successMessage: "you are successfully logged in",
  successRedirect: "/",
  failureMessage: "failed to authorize"
}));

app.get("/auth/google", passport.authenticate("google", { scope: [ "profile" ] }));

app.get("/auth/oauth_callback", passport.authenticate("google", {
  successMessage: "you are successfully logged in",
  successRedirect: "/"
}));

const port = +("" + process.env["PORT"]);
if (Number.isNaN(port)) {
  throw new Error("PORT config not found");
}

app.listen(port);
console.log("Application listening on port", port);
