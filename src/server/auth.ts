import { ErrorCode, LogicError } from "@common/errors";
import fastifyPassport from "@fastify/passport";
import fastifySecureSession from "@fastify/secure-session";
import * as childProcess from "child_process";
import { FastifyInstance, FastifyRequest } from "fastify";
import * as fs from "fs";
import * as luxon from "luxon";
import { Strategy as LocalStrategy } from "passport-local";
import * as path from "path";
// import * as jwt from "jsonwebtoken";
// import { ExtractJwt, Strategy as JwtStrategy } from "passport-jwt";


export interface UserInfo {
  id: string;
  name: string;
}


const USERS: [ id: string, name: string, password: string | undefined ][] = [
  [ "admin", "Admin", process.env["AUTH_PASSWORD"] ]
];


const SECRET = fs.readFileSync(getSecretFilePath());


export async function configureAuth(app: FastifyInstance) {
  fastifyPassport.use("local", new LocalStrategy({
    usernameField: "name",
    passwordField: "password"
  }, (user, password, done) => {
    const userRecord = USERS.find(u => u[0] === user);
    if (userRecord && userRecord[2] != null && userRecord[2] === password) {
      done(null, { id: userRecord[0], name: userRecord[0] });
    } else {
      done(new Error("User not found or password is invalid"));
    }
  }));

  // fastifyPassport.use("jwt", new JwtStrategy({
  //   jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  //   secretOrKey: SECRET,
  // }, (payload, done) => {
  //   const userRecord = USERS.find(u => u[0] === payload.id);
  //   if (userRecord) {
  //     done(null, { id: userRecord[0], name: userRecord[1] });
  //   } else {
  //     done(new Error("User not found"));
  //   }
  // }));

  fastifyPassport.registerUserSerializer(async user => user);
  fastifyPassport.registerUserDeserializer(async user => user);

  await generateSessionSecret();

  app.register(fastifySecureSession, {
    key: SECRET,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
      maxAge: luxon.Duration.fromObject({ days: 30 }).as("seconds")
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
    throw new Error("failed to initialize authorization secret: CONFIG_DIR env not set");
  }

  return path.join(configDir, "session_secret");
}


export function requireAuthenticatedUser(app: FastifyInstance) {
  // app.addHook("preValidation", fastifyPassport.authenticate([ "jwt" ], async (req, res, err, user) => {
  //   if (!err && user) {
  //     req.user = user as any;
  //   }
  // }));

  app.addHook("preValidation", async req => {
    if (!req.user) {
      throw new LogicError(ErrorCode.NotAuthorized, "Unauthorized");
    }
  });
}


export function getProfile(req: FastifyRequest): UserInfo {
  return req.user as UserInfo;
}


export default async function initAuth(app: FastifyInstance) {
  app.post("/auth/logout", async req => {
    await req.logOut();
    return {};
  });

  app.post(
      "/auth/login",
      {
        preValidation: fastifyPassport.authenticate("local", {
          successMessage: "you are successfully logged in",
          failureMessage: "failed to authorize"
        })
      },
      async req => {
        const profile = getProfile(req);
        // const token = jwt.sign({ id: profile.id, hst: req.hostname }, SECRET, {
        //   expiresIn: luxon.Duration.fromObject({ days: 30 }).as("seconds"),
        //   algorithm: "HS256"
        // });

        return {
          name: profile.name,
          // token
        };
      }
  );
}
