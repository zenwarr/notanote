import { StorageError } from "@storage/EntryStorage";
import fastify from "fastify";
import path from "path";
import fastifyFormBody from "@fastify/formbody";
import fastifyView from "@fastify/view";
import fastifyCors from "@fastify/cors";
import hbs from "handlebars";
import * as bson from "bson";
import fastifyStatic from "@fastify/static";
import { configureAuth } from "./auth";
import { getStatusCodeForError, LogicError } from "@common/errors";


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
    root: path.join(__dirname, "../static")
  });
  app.register(fastifyCors, {
    origin: (origin, done) => done(null, true),
    credentials: true,
    allowedHeaders: [ "authorization", "content-type" ]
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

  app.setErrorHandler((err, req, res) => {
    console.error("request error", err);
    if (err instanceof LogicError) {
      res.status(getStatusCodeForError(err.code)).send({
        error: err.message,
        code: err.code,
        class: "LogicError"
      });
    } else if (err instanceof StorageError) {
      res.status(500).send({
        error: err.message,
        code: err.code,
        class: "StorageError",
        path: err.path.normalized
      });
    } else if (err != null && typeof err === "object") {
      res.status(500).send({
        error: (err as any).error || (err as any).message || "internal server error"
      });
    } else {
      res.status(500).send({
        error: "internal server error"
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
