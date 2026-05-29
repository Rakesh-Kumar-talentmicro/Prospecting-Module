require('dotenv').config();

module.exports = {
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    database: process.env.DB_NAME || 'prospecting_db',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    connectionLimit: parseInt(process.env.DB_POOL_SIZE) || 10,
    waitForConnections: true,
    queueLimit: 0,
  },
  server: {
    port: parseInt(process.env.PORT) || 3000,
    env: process.env.NODE_ENV || 'development',
  },
  email: {
    provider: process.env.EMAIL_PROVIDER || 'smtp',
    from: process.env.FROM_EMAIL || 'no-reply@company.com',
    fromName: process.env.FROM_NAME || 'Company',
    smtp: {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    sendgrid: {
      apiKey: process.env.SENDGRID_API_KEY,
    },
  },
  sms: {
    provider: process.env.SMS_PROVIDER || 'twilio',
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
    pollMs: parseInt(process.env.QUEUE_POLL_MS) || 5000,
    defaultLanguage: process.env.DEFAULT_LANGUAGE || 'EN',
    maxRetries: parseInt(process.env.MAX_RETRIES) || 3,
    deadlockRescueMinutes: parseInt(process.env.DEADLOCK_RESCUE_MINUTES) || 2,
  },
};