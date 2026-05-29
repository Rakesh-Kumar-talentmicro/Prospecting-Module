const Twilio = require('twilio');
const axios = require('axios');
const config = require('../config');
const logger = require('../db/logger');

// ─────────────────────────────────────────
// Checks if Twilio error is retriable or permanent
// ─────────────────────────────────────────
const isTwilioPermanentError = (err) => {
  const permanentCodes = [
    21211, // Invalid 'To' phone number
    21214, // 'To' number cannot receive messages
    21610, // Attempt to send to unsubscribed recipient
    21408, // Permission to send to this region denied
    21606, // From number not capable of sending SMS
  ];
  return permanentCodes.includes(err.code);
};

// ─────────────────────────────────────────
// Sends SMS via Twilio or MSG91
// ─────────────────────────────────────────
const sendSMS = async (to, body) => {
  const provider = config.sms.provider;

  if (provider === 'twilio') {
    const client = new Twilio(
      config.sms.twilio.sid,
      config.sms.twilio.token
    );

    try {
      const message = await client.messages.create({
        body,
        from: config.sms.twilio.from,
        to,
      });

      logger.info(
        `[SMS][Twilio] Sent to ${to} | SID: ${message.sid} | Status: ${message.status}`
      );
      return {
        provider: 'twilio',
        messageId: message.sid,
        status: message.status,
        statusCode: 200,
      };

    } catch (err) {
      // Permanent Twilio error — retry karna waste hai
      if (isTwilioPermanentError(err)) {
        logger.error(
          `[SMS][Twilio] Permanent error to ${to} | Code: ${err.code} | ${err.message}`
        );
        // PERMANENT_ prefix lagao taaki worker seedha FAILED kare
        throw new Error(`PERMANENT_${err.message}`);
      }
      // Retriable error — worker normal retry karega
      throw err;
    }

  } else if (provider === 'msg91') {
    const response = await axios.post(
      'https://api.msg91.com/api/v5/flow/',
      {
        template_id: config.sms.msg91.templateId,
        short_url: '0',
        mobiles: to.replace('+', ''),
        VAR1: body,
      },
      {
        headers: {
          authkey: config.sms.msg91.key,
          'Content-Type': 'application/json',
        },
        timeout: 10000, // 10 second timeout
      }
    );

    // MSG91 success response check
    if (response.data?.type === 'error') {
      throw new Error(`MSG91_ERROR: ${response.data.message}`);
    }

    logger.info(`[SMS][MSG91] Sent to ${to}`);
    return {
      provider: 'msg91',
      messageId: response.data.request_id || null,
      status: response.data.type || 'success',
      statusCode: response.status,
    };

  } else {
    throw new Error(`UNKNOWN_SMS_PROVIDER: ${provider}`);
  }
};

module.exports = { sendSMS };