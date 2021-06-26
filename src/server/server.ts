import fastify  from "fastify";
import path from "path";
import fastifyFormBody from "fastify-formbody";
import pointOfView from "point-of-view";
import hbs from "handlebars";
import fastifyStatic from "fastify-static";
import { configureAuth } from "./auth";


export async function startApp() {
  hbs.registerHelper("json", ctx => JSON.stringify(ctx));

  const app = fastify({
    logger: {
      level: "warn"
    }
  });

  app.register(fastifyFormBody);
  app.register(pointOfView, {
    engine: {
      handlebars: hbs
    },
    root: path.join(__dirname, "../views")
  });
  app.register(fastifyStatic, {
    root: path.join(__dirname, "../static"),
    prefix: "/static"
  });

  await configureAuth(app);

  app.register(require("./api"));
  app.register(require("./auth"));
  app.register(require("./ui"));

  const port = process.env["PORT"] ?? 80;
  await app.listen(port, "0.0.0.0");
  console.log("Application listening on port", port);
}
