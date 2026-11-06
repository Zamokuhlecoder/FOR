const nodemailer = require("nodemailer");

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const phone = req.body && req.body.phone;
  if (typeof phone !== "string" || !/^[0-9]{7,15}$/.test(phone)) {
    return res.status(400).json({ error: "Enter a valid phone number with country code." });
  }

  const { SMTP_USER, SMTP_PASSWORD, EMAIL_TO } = process.env;
  if (!SMTP_USER || !SMTP_PASSWORD || !EMAIL_TO) {
    console.error("Email configuration is missing.");
    return res.status(500).json({ error: "Email service is not configured." });
  }

  const transport = nodemailer.createTransport({
    service: "gmail",
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD.replace(/\s/g, "") },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000
  });

  try {
    await transport.sendMail({
      from: SMTP_USER,
      to: EMAIL_TO,
      subject: "New WhatsApp number",
      text: `A WhatsApp number was submitted: +${phone}`
    });
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Failed to send the WhatsApp number email.");
    return res.status(502).json({ error: "Could not send the email. Please try again." });
  }
};
