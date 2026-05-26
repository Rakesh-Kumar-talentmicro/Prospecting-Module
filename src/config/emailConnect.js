import nodemailer from "nodemailer"
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || "YourEmail@gmail.com",
    pass: process.env.SMTP_PASS || "YourPassword",
  },
});

export default transporter;