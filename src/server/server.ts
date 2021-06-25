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
    logger: true
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

  configureAuth(app);

  app.register(require("./api"));
  app.register(require("./auth"));
  app.register(require("./ui"));

  await app.listen(process.env["PORT"]!, "0.0.0.0");
  console.log("Application listening on port", process.env["PORT"]);
}
