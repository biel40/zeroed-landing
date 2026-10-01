import nodemailer from 'nodemailer';
import { BETA_INBOX, createBetaHandler } from '../server/beta-signup.mjs';

let transport;
export default createBetaHandler(
  async (message) => {
    transport ??= nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user: BETA_INBOX, pass: process.env.BETA_GMAIL_APP_PASSWORD?.replace(/\s/g, '') },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 15000,
    });
    return transport.sendMail(message);
  },
  () => Boolean(process.env.BETA_GMAIL_APP_PASSWORD?.trim()),
);
