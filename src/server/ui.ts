import { FastifyInstance } from "fastify";


export default async function initUiRoutes(app: FastifyInstance) {
  app.get("/", async (req, res) => {
    return res.view("index");
  });
}
