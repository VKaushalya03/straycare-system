const nodemailer = require("nodemailer");

const sendEmail = async (optionsOrTo, subject, text) => {
  // 1. Determine if we received an object OR separate arguments
  const toAddress =
    typeof optionsOrTo === "object" ? optionsOrTo.to : optionsOrTo;
  const emailSubject =
    typeof optionsOrTo === "object" ? optionsOrTo.subject : subject;
  const emailText = typeof optionsOrTo === "object" ? optionsOrTo.text : text;

  // 2. Safety Check: Stop here if there's no email address!
  if (!toAddress) {
    console.log(
      "⚠️ Skipped sending email: No recipient email address provided.",
    );
    return;
  }

  try {
    // Create a transporter using your Gmail App Password
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Define the email content
    const mailOptions = {
      from: `StrayCare System <${process.env.EMAIL_USER}>`,
      to: toAddress,
      subject: emailSubject,
      text: emailText,
    };

    // Send the email
    await transporter.sendMail(mailOptions);
    console.log(`📧 Real Email successfully sent to: ${toAddress}`);
  } catch (error) {
    console.error("❌ Error sending email:", error.message);
  }
};

module.exports = sendEmail;
