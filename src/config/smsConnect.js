import twilio from 'twilio';
import dotenv from "dotenv";
dotenv.config();

const accountSid = process.env.ACCOUNT_SID;
const authToken = process.env.AUTH_TOKEN;
const phoneNumber = process.env.PHONE;
const client = twilio(accountSid, authToken);

export async function sms({ body, to_address }) {
  try{
    const message = await client.messages.create({
      body: body,
      to: `+91${to_address}`,
      from: phoneNumber, // From a valid Twilio number
    });
  return message;
  }catch(err){
    throw err;
  }

}