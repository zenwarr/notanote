import { getProfile, requireAuthenticatedUser } from "./auth";
import { FastifyInstance } from "fastify";


export default async function initUiRoutes(app: FastifyInstance) {
  requireAuthenticatedUser(app);

  app.get("/", (req, res) => {
    res.view("index", {
      // userName: getProfile(req).name
      userName: "Default user"
    });
  });
}
