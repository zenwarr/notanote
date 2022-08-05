import fastify from "fastify";
import path from "path";
import fastifyFormBody from "@fastify/formbody";
import fastifyMultipart from "@fastify/multipart";
import fastifyView from "@fastify/view";
import hbs from "handlebars";
import fastifyStatic from "@fastify/static";
import { configureAuth } from "./auth";
import { ErrorCode, getStatusCodeForError, LogicError } from "@common/errors";


export async function startApp() {
  hbs.registerHelper("json", ctx => JSON.stringify(ctx));

  const app = fastify({
    logger: {
      level: "warn"
    }
  });

  app.register(fastifyFormBody);
  app.register(fastifyMultipart, {
    limits: {
      files: 1,
      fileSize: 1024 * 1024 * 20 // 20MB
    }
  });
  app.register(fastifyView, {
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

  app.setErrorHandler((error, req, res) => {
    console.error("request error", error);
    if (error instanceof LogicError) {
      res.status(getStatusCodeForError(error.code)).send({
        error: error.code,
        text: error.text
      });
    } else {
      res.status(500).send({
        error: ErrorCode.Internal,
        text: "internal server error"
      });
    }
  });

  app.register(require("./api"));
  app.register(require("./auth"));
  app.register(require("./ui"));

  const port = process.env["PORT"] ?? 80;
  await app.listen({
    host: "0.0.0.0",
    port: +port
  });
  console.log("Application listening on port", port);
}
