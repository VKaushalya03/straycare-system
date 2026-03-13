const nodemailer = require("nodemailer");

const sendEmail = async (options) => {
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
      to: options.to,
      subject: options.subject,
      text: options.text,
    };

    // Send the email
    await transporter.sendMail(mailOptions);
    console.log(`📧 Real Email successfully sent to: ${options.to}`);
  } catch (error) {
    console.error("❌ Error sending email:", error);
  }
};

module.exports = sendEmail;
