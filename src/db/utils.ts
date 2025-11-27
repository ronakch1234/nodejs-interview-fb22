import { query } from "./index";

export async function createDatabaseIfNotExists() {
  const dbName = process.env.DB_NAME || "nodejs_interview";
  const text = `CREATE DATABASE ${dbName};`;
  try {
    await query(text);
    console.log(`Database ${dbName} created successfully`);
  } catch (error: any) {
    if (error.code === "42P04") {
      console.log(`Database ${dbName} already exists`);
    } else {
      console.error("Error creating database:", error);
      throw error;
    }
  }
}

export async function dropTablesIfExists() {
  const paymentsTableText = `DROP TABLE IF EXISTS payments;`;
  const failedPaymentsTableText = `DROP TABLE IF EXISTS failed_payments;`;
  try {
    await query(paymentsTableText);
    await query(failedPaymentsTableText);
    console.log("Tables dropped successfully");
  } catch (error) {
    console.error("Error dropping tables:", error);
    throw error;
  }
}

export async function createPaymentsTable() {
  const text = `
    CREATE TABLE IF NOT EXISTS payments (
      id SERIAL PRIMARY KEY,
      transaction_id VARCHAR(100) NOT NULL,
      amount NUMERIC(10, 2) NOT NULL,
      status VARCHAR(10) NOT NULL,
      timestamp TIMESTAMP NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  try {
    await query(text);
    console.log("Payment table created successfully");
  } catch (error) {
    console.error("Error creating payments table:", error);
    throw error;
  }
}

export async function createFailedPaymentsTable() {
  const text = `
    CREATE TABLE IF NOT EXISTS failed_payments (
      id SERIAL PRIMARY KEY,
      payment_id VARCHAR(100) NOT NULL,
      retryable BOOLEAN NOT NULL DEFAULT TRUE,
      last_attempt_at TIMESTAMP NOT NULL
    );
  `;

  try {
    await query(text);
    console.log("Failed payments table created successfully");
  } catch (error) {
    console.error("Error creating failed payments table:", error);
    throw error;
  }
}

export async function getAllPayments(filterString?: string) {
  let text =
    "SELECT id, transaction_id, amount, status, timestamp, created_at FROM payments";
  if (filterString) text = text + ` WHERE ${filterString};`;

  console.log("Executing query:", text);
  const result = await query(text);
  return result.rows;
}

export async function getAllFailedPayments() {
  let text = "SELECT * FROM failed_payments WHERE retryable = true;";
  const result = await query(text);
  return result.rows;
}

export async function updateFailedPayments(id: number) {
  let text = "UPDATE failed_payments SET retryable = false WHERE id = $1;";
  const result = await query(text, [id]);
  return result.rows;
}

export async function getPaymentById(id: number) {
  const text =
    "SELECT id, transaction_id, amount, status, timestamp, created_at FROM payments WHERE id = $1;";
  const result = await query(text, [id]);
  return result.rows[0] || null;
}

export async function createPayment(
  transactionId: string,
  amount: number,
  status: string,
  timestamp: string
) {
  const text = `
    INSERT INTO payments (transaction_id, amount, status, timestamp)
    VALUES ($1, $2, $3, $4)
    RETURNING id, transaction_id, amount, status, timestamp, created_at;
  `;
  const result = await query(text, [transactionId, amount, status, timestamp]);
  return result.rows[0];
}

export async function createFailedPayment(
  paymentId: string,
  retryable: boolean,
  lastAttemptAt: string
) {
  const text = `
    INSERT INTO failed_payments (payment_id, retryable, last_attempt_at)
    VALUES ($1, $2, $3)
    RETURNING id, payment_id, retryable, last_attempt_at;
  `;
  const result = await query(text, [paymentId, retryable, lastAttemptAt]);
  return result.rows[0];
}

export async function deletePayment(id: number) {
  const text = "DELETE FROM payments WHERE id = $1 RETURNING id;";
  const result = await query(text, [id]);
  return result.rows[0] || null;
}

export async function testConnection() {
  try {
    const result = await query("SELECT NOW();");
    console.log("Database connection successful!");
    return true;
  } catch (error) {
    console.error("Database connection failed:", error);
    return false;
  }
}
