import dotenv from "dotenv";

dotenv.config();

const config = {
  db: {
    host: process.env.DB_HOST || "localhost",
    port: Number.parseInt(process.env.DB_PORT, 10) || 3306,
    database: process.env.DB_NAME || "prospecting_db",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    connectionLimit: Number.parseInt(process.env.DB_POOL_SIZE, 10) || 10,
    waitForConnections: true,
    queueLimit: 0,
  },

  server: {
    port: Number.parseInt(process.env.PORT, 10) || 3000,
    env: process.env.NODE_ENV || "development",
  },

  email: {
    provider: process.env.EMAIL_PROVIDER || "smtp",
    from: process.env.FROM_EMAIL || "no-reply@company.com",
    fromName: process.env.FROM_NAME || "Company",

    smtp: {
      host: process.env.SMTP_HOST,
      port: Number.parseInt(process.env.SMTP_PORT, 10) || 587,
      secure: process.env.SMTP_SECURE === "true",
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },

    sendgrid: {
      apiKey: process.env.SENDGRID_API_KEY,
    },
  },

  sms: {
    provider: process.env.SMS_PROVIDER || "twilio",

    twilio: {
      sid: process.env.TWILIO_SID,
      token: process.env.TWILIO_TOKEN,
      from: process.env.TWILIO_FROM,
    },

    msg91: {
      key: process.env.MSG91_KEY,
      senderId: process.env.MSG91_SENDER_ID,
      templateId: process.env.MSG91_TEMPLATE_ID,
    },
  },

  worker: {
    pollMs: Number.parseInt(process.env.QUEUE_POLL_MS, 10) || 5000,
    defaultLanguage: process.env.DEFAULT_LANGUAGE || "EN",
    maxRetries: Number.parseInt(process.env.MAX_RETRIES, 10) || 3,
    deadlockRescueMinutes:
      Number.parseInt(process.env.DEADLOCK_RESCUE_MINUTES, 10) || 2,
  },
};

export default config;
