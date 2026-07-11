import express from "express";
import cors from "cors";
import { config } from "./config";
import { importRouter } from "./routes/import.routes";
import { errorMiddleware, notFoundHandler } from "./middleware/error.middleware";
import { logger } from "./utils/logger";

const app = express();

app.use(
  cors({
    origin: config.isProduction ? config.corsOrigin : true,
  }),
);
app.use(express.json({ limit: `${config.maxFileSizeMb + 2}mb` }));

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api/import", importRouter);

app.use(notFoundHandler);
app.use(errorMiddleware);

app.listen(config.port, () => {
  logger.info(`GrowEasy CSV Importer backend listening on port ${config.port}`, {
    env: config.nodeEnv,
    model: config.openrouter.model,
  });
});
