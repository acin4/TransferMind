import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import "./lib/env.js";
import routes from "./api/routes.js";
import { handleError } from "./lib/http.js";

export const app = express();
const port = Number(process.env.PORT || 3001);
const corsOrigin = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((origin) => origin.trim())
  : true;

app.use(cors({ origin: corsOrigin }));
app.use(express.json());

app.get("/health", (req, res) => {
  res.status(200).json({ data: { status: "ok" } });
});

app.use("/api", routes);
app.use(handleError);

const currentFilePath = fileURLToPath(import.meta.url);

if (process.argv[1] === currentFilePath) {
  app.listen(port, () => {
    console.log(`TransferMind backend listening on port ${port}`);
  });
}
