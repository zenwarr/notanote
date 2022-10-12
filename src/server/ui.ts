import { FastifyInstance } from "fastify";


const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Nuclear notes</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link rel="stylesheet" href="/index.css">
  <link rel="icon" href="/icon.svg" type="image/svg"/>
  <link rel="manifest" href="/manifest.json" />
</head>
<body>
<div id="root"></div>
<script src="/index.js"></script>
</body>
</html>`;


export default async function initUiRoutes(app: FastifyInstance) {
  app.get("/", async (req, res) => {
    res.header("Content-Type", "text/html");
    return html;
  });

  app.get("/f/*", async (req, res) => {
    res.header("Content-Type", "text/html");
    return html;
  });
}
