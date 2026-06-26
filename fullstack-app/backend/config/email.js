const nodemailer = require('nodemailer');
const config = require('./env');

const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: false,
  auth: {
    user: config.email.from,
    pass: config.email.password,
  },
});

async function sendEmail({ to, subject, text, html }) {
  return transporter.sendMail({
    from: config.email.from,
    to,
    subject,
    text,
    html,
  });
}

module.exports = { sendEmail };
