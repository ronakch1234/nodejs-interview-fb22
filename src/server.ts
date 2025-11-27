import express from "express";
import dotenv from "dotenv";
import {
  testConnection,
  createPaymentsTable,
  createFailedPaymentsTable,
  dropTablesIfExists,
  createDatabaseIfNotExists,
} from "./db/utils";
import pool from "./db";
import paymentRouter from "./routes/payment";
import { logger } from "./logger";

dotenv.config();

const app = express();

app.use(express.json());
app.use((req, res, next) => {
  logger.info(`Incoming request: ${req.method} ${req.url}`);
  next();
});
app.use(paymentRouter);

app.get("/", (req: express.Request, res: express.Response) => {
  res.send("Hello, World! Use /health to test database connection");
});

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);

  try {
    await testConnection();
    await createDatabaseIfNotExists();
    await dropTablesIfExists();
    await createPaymentsTable();
    await createFailedPaymentsTable();
  } catch (error) {
    logger.error("Failed to create payments table:", error);
  }
});

process.on("SIGINT", async () => {
  logger.info("Shutting down gracefully...");
  server.close();
  await pool.end();
  process.exit(0);
});

export default app;
