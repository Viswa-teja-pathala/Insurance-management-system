import nodemailer from "nodemailer";

let transporterPromise: Promise<nodemailer.Transporter> | null = null;

async function getTransporter() {
  if (!transporterPromise) {
    transporterPromise = nodemailer.createTestAccount().then((testAccount) =>
      nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      })
    );
  }
  return transporterPromise;
}

export async function sendClaimStatusEmail(to: string, claimNumber: string, status: string) {
  try {
    const transporter = await getTransporter();
    const info = await transporter.sendMail({
      from: '"InsureMS" <noreply@insurems.test>',
      to,
      subject: `Claim ${claimNumber} status updated: ${status}`,
      text: `Your claim ${claimNumber} has been updated to ${status}.`,
      html: `<p>Your claim <strong>${claimNumber}</strong> has been updated to <strong>${status}</strong>.</p>`,
    });
    console.log("Email sent. Preview URL:", nodemailer.getTestMessageUrl(info));
  } catch (err) {
    console.error("Failed to send email:", err);
  }
}