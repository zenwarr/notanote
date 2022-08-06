import fastify from "fastify";
import path from "path";
import fastifyFormBody from "@fastify/formbody";
import fastifyView from "@fastify/view";
import hbs from "handlebars";
import * as bson from "bson";
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

  app.addContentTypeParser("application/bson", (_, payload, done) => {
    let buf: Buffer | undefined = undefined;
    payload.on("data", chunk => {
      if (!Buffer.isBuffer(chunk)) {
        done(new Error("invalid data for application/bson: buffer expected"));
        return;
      }

      if (!buf) {
        buf = chunk;
      } else {
        buf = Buffer.concat([ buf, chunk ]);
      }
    });
    payload.on("error", done);
    payload.on("end", () => {
      if (!buf) {
        done(new Error("no data for application/bson request"));
        return;
      }

      try {
        done(null, bson.deserialize(buf, { promoteBuffers: true }));
      } catch (err: any) {
        done(err);
      }
    });
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
