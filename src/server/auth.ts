import fastifyPassport from "fastify-passport";
import fastifySecureSession from "fastify-secure-session";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { FastifyInstance, FastifyRequest } from "fastify";
import * as fs from "fs";
import * as path from "path";


export interface UserInfo {
  id: string;
  name: string;
}


export function configureAuth(app: FastifyInstance) {
  fastifyPassport.use("google", new GoogleStrategy({
    clientID: process.env["OAUTH_CLIENT_ID"]!,
    clientSecret: process.env["OAUTH_SECRET"]!,
    callbackURL: process.env["OAUTH_REDIRECT_URL"]
  }, (accessToken: string, refreshToken: string, profile: any, cb: (err?: Error, user?: UserInfo) => void) => {
    if (profile.id !== process.env["USER_PROFILE_ID"]) {
      cb(new Error("you are not allowed to use this application"));
    } else {
      cb(undefined, { id: profile.id, name: profile.displayName });
    }
  }));

  fastifyPassport.use("local", new LocalStrategy({
    usernameField: "password",
    passwordField: "password"
  }, (password, _, done) => {
    if (password === process.env["AUTH_PASSWORD"]) {
      done(null, { id: "default", name: "Default user" });
    } else {
      done(new Error("user not found"));
    }
  }));

  fastifyPassport.registerUserSerializer(async user => user);
  fastifyPassport.registerUserDeserializer(async user => user);

  // const redisClient = redis.createClient({
  //   host: process.env["REDIS_HOST"]
  // });
  // const RedisStore = connectRedis(session);
  //
  // app.use(session({
  //   store: new RedisStore({ client: redisClient }),
  //   secret: "k8WHaL2YsP6uDz7LRhHz9",
  //   resave: true,
  //   saveUninitialized: true,
  //   name: "sess"
  // }));
  app.register(fastifySecureSession, {
    key: fs.readFileSync(path.join(__dirname, "secret_key")),
    cookie: {
      httpOnly: true,
      path: "/"
    },
    cookieName: "sess"
  });
  app.register(fastifyPassport.initialize());
  app.register(fastifyPassport.secureSession());
}


export function requireAuthenticatedUser(app: FastifyInstance) {
  app.addHook("preValidation", async (req, res) => {
    console.log("preValidation auth hook", req.isAuthenticated);
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      res.redirect("/auth");
    }
  });
}

export function getProfile(req: FastifyRequest): UserInfo {
  return (req.session as any).passport.user;
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
