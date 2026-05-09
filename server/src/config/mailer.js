const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '465'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter;
}

async function sendMail({ to, subject, html }) {
  if (!process.env.SMTP_HOST) return; // тихо пропускаем если SMTP не настроен
  try {
    await getTransporter().sendMail({
      from: process.env.EMAIL_FROM || '"Единое Окно ЧГУ" <noreply@chesu.ru>',
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error('[mailer] Failed to send email:', err.message);
  }
}

module.exports = { sendMail };
