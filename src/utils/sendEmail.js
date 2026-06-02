import transporter from "../config/emailConnect.js";

const sendEmail = async ({ to,subject,body}) => {
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

(async () => {
  try {
    const result = await sendEmail({
      to: "rakesh.si3168@gmail.com",
      subject: "Test Email from Prospecting Module",
      body: "This is a test email sent from the Prospecting Module.",
    });

    console.log("Result:", result);
  } catch (err) {
    console.error("Failed:", err);
  }
})();
