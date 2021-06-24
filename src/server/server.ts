import express from "express";
import path from "path";
import { initAppAuth, initAuthRoutes } from "./auth";
import { initApi } from "./api";


function createApp(): express.Application {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded());
  app.set("views", path.join(__dirname, "../views"));
  app.set("view engine", "hbs");
  app.use("/static", express.static("static"));

  initAppAuth(app);

  return app;
}


function startListen(app: express.Application) {
  const port = +("" + process.env["PORT"]);
  if (Number.isNaN(port)) {
    throw new Error("PORT config not found");
  }

  app.listen(port);
  console.log("Application listening on port", port);
}


export function startApp() {
  const app = createApp();

  initAuthRoutes(app);
  initApi(app);

  startListen(app);
}
