import { ensureLoggedIn, getProfile } from "./auth";
import express from "express";


export function initUiRoutes(app: express.Application) {
  app.get("/", ensureLoggedIn, (req, res) => {
    res.render("index", {
      userName: getProfile(req).name
    });
  });
}
