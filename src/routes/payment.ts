import express from "express";
import {
  createFailedPayment,
  createPayment,
  getAllFailedPayments,
  getAllPayments,
  testConnection,
  updateFailedPayments,
} from "../db/utils";
import { logger } from "../logger";

const router = express.Router();

const validStatuses = ["SUCCESS", "FAILED", "PENDING"];

router.post(
  "/webhooks/payment",
  async (req: express.Request, res: express.Response) => {
    const paymentData = req.body;
    logger.info("Received payment webhook:", paymentData);
    const { transactionId, amount, status, timestamp } = paymentData;
    if (Number(amount) <= 0)
      res.status(400).json("Amount should be greater than zero");
    if (!validStatuses.includes(status))
      res.status(400).json("Invalid status value");

    const newPayment = await createPayment(
      transactionId,
      Number(amount),
      status,
      timestamp
    );

    if (status === "FAILED") {
      await createFailedPayment(newPayment.id, true, new Date().toISOString());
    }
    logger.info("Payment recorded:", newPayment);
    res.status(201).json(newPayment);
  }
);

router.get("/payments", async (req: express.Request, res: express.Response) => {
  const { status } = req.query;

  const payments = await getAllPayments(
    status ? `status='${status}'` : undefined
  );
  res.status(201).json(payments);
});

setInterval(async () => {
  try {
    const failedPayments = await getAllFailedPayments();
    for (const payment of failedPayments) {
      logger.info("Retrying failed payment:", payment);
      await updateFailedPayments(payment.id);
      logger.info("Payment retried successfully:", payment);
    }
  } catch (error) {
    logger.error("Error retrying failed payments:", error);
  }
}, 5000);

export default router;
