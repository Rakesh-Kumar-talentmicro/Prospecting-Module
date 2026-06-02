import { sms } from "../config/smsConnect.js";

export const sendSMS = async ({ body, to_address }) => {
 
    const result = await sms({ body, to_address });
    return {
        provider: 'TWILIO SMS',
        messageId: result.sid 
    };
};