import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import express from "express";
import session from "express-session";
import redis from "redis";
import connectRedis from "connect-redis";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";


export interface UserInfo {
  id: string;
  name: string;
}


export function ensureLoggedIn(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (req.isAuthenticated()) {
    next();
  } else {
    res.redirect("/auth");
  }
}


export function initAuthRoutes(app: express.Application) {
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
}


export function initAppAuth(app: express.Application) {
  passport.use("google", new GoogleStrategy({
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

  const redisClient = redis.createClient({
    host: process.env["REDIS_HOST"]
  });
  const RedisStore = connectRedis(session);

  app.use(session({
    store: new RedisStore({ client: redisClient }),
    secret: "k8WHaL2YsP6uDz7LRhHz9",
    resave: true,
    saveUninitialized: true,
    name: "sess"
  }));
  app.use(passport.initialize());
  app.use(passport.session());
}


export function getProfile(req: express.Request): UserInfo {
  return (req.session as any).passport.user;
}
