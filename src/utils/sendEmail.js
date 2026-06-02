import transporter from "../config/emailConnect.js";

export const sendEmail = async ({ to,subject,body}) => {
 try{
    const info = await transporter.sendMail({
    to: to,
    subject: subject, 
    text: body, 
    });
    console.log("Message sent:", info.messageId);
    return {success: true,provider: 'EMAIL',messageId: info.messageId};
 } catch(err){
   console.error("Error while sending mail:", err);
   throw err;
 }
};
