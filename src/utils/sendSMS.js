import { sms } from "../config/smsConnect.js";

export const sendSMS = async ({ body, to_address }) => {
 try {
    const result = await sms({ body, to_address });
    return {
        provider: 'TWILIO SMS',
        messageId: result.sid 
    };
 } catch(err){
   throw err;
 }
};