const Brevo = require("@getbrevo/brevo");

const apiInstance = new Brevo.TransactionalEmailsApi();
apiInstance.authentications["apiKey"].apiKey = process.env.BREVO_API_KEY;

exports.sendEmail = async (toEmail, toName, subject, htmlContent) => {
  try {
    const sendSmtpEmail = {
      sender: {
        email: "habeebolayemi518@gmail.com", 
        name: "Anizoomey App",
      },
      to: [{ email: toEmail, name: toName }],
      subject,
      htmlContent,
    };

    const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
    console.log(" Email sent:", response);
    return response;
  } catch (error) {
    console.error(" Error sending email:", error.message);
    throw error;
  }
};


