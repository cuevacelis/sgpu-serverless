import {
  SESClient,
  SendEmailCommand,
  SendEmailCommandInput,
} from "@aws-sdk/client-ses";
import { SQSEvent } from "aws-lambda";

const sesClient = new SESClient({ region: "us-east-1" });

export const handler = async (event: SQSEvent) => {
  for (const record of event.Records) {
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

    // Construir el cuerpo del mensaje
    const body: NonNullable<SendEmailCommandInput["Message"]>["Body"] = {};

    if (html) {
      body.Html = { Data: html };
    }
    if (text) {
      body.Text = { Data: text };
    }

    // Asegurarse de que al menos una de las opciones está presente
    if (!body.Html && !body.Text) {
      console.error("No content for email body");
      continue;
    }

    // Definir los parámetros con el tipo SendEmailCommandInput
    const params: SendEmailCommandInput = {
      Source: '"CALPU" <no-reply@mail.calculopreciosunitarios.com>',
      Destination: {
        ToAddresses: [to],
      },
      Message: {
        Subject: { Data: subject },
        Body: body,
      },
    };

    // Enviar el correo electrónico
    try {
      const command = new SendEmailCommand(params);
      const result = await sesClient.send(command);
    } catch (error: any) {
      console.error(`Error sending email to ${to}: ${error.message}`, error);
    }
  }
};
