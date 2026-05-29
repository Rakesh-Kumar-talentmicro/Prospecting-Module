const nodemailer = require('nodemailer');
const sgMail = require('@sendgrid/mail');
const config = require('../config');
const logger = require('../db/logger');

const smtpTransport = nodemailer.createTransport({
  host: config.email.smtp.host,
  port: config.email.smtp.port,
  secure: config.email.smtp.secure,
  auth: {
    user: config.email.smtp.user,
    pass: config.email.smtp.pass,
  },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
});

const sendEmail = async (to, subject, body) => {
  const provider = config.email.provider;

  if (provider === 'sendgrid') {
    sgMail.setApiKey(config.email.sendgrid.apiKey);
    const response = await sgMail.send({
      to,
      from: { email: config.email.from, name: config.email.fromName },
      subject,
      html: body,
    });
    logger.info(`[EMAIL][SendGrid] Sent to ${to}`);
    return {
      provider: 'sendgrid',
      messageId: response[0].headers['x-message-id'] || null,
      statusCode: response[0].statusCode,
    };
  } else {
    const info = await smtpTransport.sendMail({
      from: `"${config.email.fromName}" <${config.email.from}>`,
      to,
      subject,
      html: body,
    });
    logger.info(`[EMAIL][SMTP] Sent to ${to} | MessageId: ${info.messageId}`);
    return { provider: 'smtp', messageId: info.messageId, statusCode: 250 };
  }
};

module.exports = { sendEmail };