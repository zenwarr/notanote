import fastifyPassport from "fastify-passport";
import fastifySecureSession from "fastify-secure-session";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { FastifyInstance, FastifyRequest } from "fastify";
import * as fs from "fs";
import * as path from "path";
import * as childProcess from "child_process";
import * as luxon from "luxon";


export interface UserInfo {
  id: string;
  name: string;
}


const GOOGLE_PROFILE_ID = process.env["USER_PROFILE_ID"] || "unknown";
const LOCAL_AUTH_PASSWORD = process.env["AUTH_PASSWORD"];


export async function configureAuth(app: FastifyInstance) {
  fastifyPassport.use("google", new GoogleStrategy({
    clientID: process.env["OAUTH_CLIENT_ID"]!,
    clientSecret: process.env["OAUTH_SECRET"]!,
    callbackURL: process.env["OAUTH_REDIRECT_URL"]
  }, (accessToken: string, refreshToken: string, profile: any, cb: (err?: Error, user?: UserInfo) => void) => {
    if (profile.id !== GOOGLE_PROFILE_ID) {
      cb(new Error("you are not allowed to use this application"));
    } else {
      cb(undefined, { id: GOOGLE_PROFILE_ID, name: profile.displayName });
    }
  }));

  fastifyPassport.use("local", new LocalStrategy({
    usernameField: "password",
    passwordField: "password"
  }, (password, _, done) => {
    if (password === LOCAL_AUTH_PASSWORD) {
      done(null, { id: GOOGLE_PROFILE_ID, name: "Default user" });
    } else {
      done(new Error("user not found"));
    }
  }));

  fastifyPassport.registerUserSerializer(async user => user);
  fastifyPassport.registerUserDeserializer(async user => user);

  await generateSessionSecret();
  app.register(fastifySecureSession, {
    key: fs.readFileSync(getSecretFilePath()),
    cookie: {
      httpOnly: true,
      secure: process.env["NODE_ENV"] !== "dev",
      path: "/",
      maxAge: luxon.Duration.fromObject({ days: 30 }).as("millisecond")
    },
    cookieName: "sess"
  });
  app.register(fastifyPassport.initialize());
  app.register(fastifyPassport.secureSession());
}


async function generateSessionSecret() {
  const secretFilePath = getSecretFilePath();
  if (!fs.existsSync(secretFilePath)) {
    try {
      console.log("generating session secret");

      const output = childProcess.execSync("./node_modules/.bin/secure-session-gen-key");
      fs.writeFileSync(secretFilePath, output);
    } catch (error) {
      console.error("failed to generate session secret", error);
    }
  }
}


function getSecretFilePath() {
  const configDir = process.env["CONFIG_DIR"];
  if (!configDir) {
    throw new Error("failed to initialize session support: CONFIG_DIR env not set");
  }

  return path.join(configDir, "session_secret");
}


export function requireAuthenticatedUser(app: FastifyInstance) {
  app.addHook("preValidation", async (req, res) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      res.redirect("/auth");
    }
  });
}


export function getProfile(req: FastifyRequest): UserInfo {
  return req.session?.get("passport");
}


export default async function initAuth(app: FastifyInstance) {
  app.get("/auth", (req, res) => {
    res.view("auth");
  });

  app.post(
      "/auth/code",
      {
        preValidation: fastifyPassport.authenticate("local", {
          successMessage: "you are successfully logged in",
          successRedirect: "/",
          failureMessage: "failed to authorize"
        })
      },
      () => {
        // do nothing
      }
  );

  app.get(
      "/auth/google",
      {
        preValidation: fastifyPassport.authenticate("google", {
          scope: [ "profile" ]
        })
      },
      () => {
        // do nothing
      }
  );

  app.get(
      "/auth/oauth_callback",
      {
        preValidation: fastifyPassport.authenticate("google", {
          successMessage: "you are successfully logged in",
          successRedirect: "/"
        })
      },
      () => {
        // do nothing
      }
  );
}
