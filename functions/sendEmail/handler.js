import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const sesClient = new SESClient({ region: "us-east-1" });

export const handler = async (event) => {
  for (const record of event.Records) {
    console.log("Message received:", record.body);
    const messageBody = JSON.parse(record.body);
    const { type, data } = messageBody;

    if (type !== "email" || !data) {
      console.error("Invalid message type or missing data");
      continue;
    }

    const { to, subject, text, html } = data;

    if (!to || !subject || (!text && !html)) {
      console.error("Missing required email fields");
      continue;
    }

    const params = {
      Destination: {
        ToAddresses: [to],
      },
      Message: {
        Body: {},
        Subject: { Data: subject },
      },
      Source: '"SGPU" <no-reply@mail.calculopreciosunitarios.com>',
    };

    if (html) {
      params.Message.Body.Html = { Data: html };
    }
    if (text) {
      params.Message.Body.Text = { Data: text };
    }

    // Using try-catch for the email sending logic only
    try {
      const command = new SendEmailCommand(params);
      const result = await sesClient.send(command);
      console.log(
        `Email sent successfully to ${to}. MessageId: ${result.MessageId}`
      );
    } catch (error) {
      console.error(`Error sending email to ${to}: ${error.message}`, error);
    }
  }

  //   return { statusCode: 200, body: "Emails processed" };
};
