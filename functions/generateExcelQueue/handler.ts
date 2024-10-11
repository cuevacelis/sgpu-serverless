import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { generateExcel } from "./generateExcel";
import { SQSEvent } from "aws-lambda";

const s3Client = new S3Client({ region: "us-east-1" });
const sqsClient = new SQSClient({ region: "us-east-1" });

export const handler = async (event: SQSEvent) => {
  try {
    for (const record of event.Records) {
      console.log("Processing record:", record.body);

      // Parse the message body
      const messageBody = JSON.parse(record.body);
      const { type, dataSend } = messageBody;
      const { data, userId, prefixNameFile, email } = dataSend;

      if (type !== "excel-export" || !data || !userId || !prefixNameFile) {
        console.error("Invalid message type or missing data");
        continue;
      }

      // Generate the Excel file
      const excelData = await generateExcel(data);
      console.log("Excel data generated");

      // Upload the file to S3
      const bucketName = process.env.S3_BUCKET_NAME;
      const fileName = `${prefixNameFile}-${Date.now()}.xlsx`;

      const putCommand = new PutObjectCommand({
        Bucket: bucketName,
        Key: fileName,
        Body: excelData,
        ContentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      await s3Client.send(putCommand);
      console.log("File uploaded to S3 successfully");

      // Generate the signed URL for downloading
      const signedUrl = await getSignedUrl(
        s3Client,
        new GetObjectCommand({
          Bucket: bucketName,
          Key: fileName,
        }),
        { expiresIn: 604800 } // 7 days in seconds
      );

      console.log("Signed URL generated:", signedUrl);

      // Send a message to the SQS queue for Ably notifications
      const sqsAblyParams = {
        QueueUrl: process.env.SQS_QUEUE_URL_ABLY,
        MessageBody: JSON.stringify({
          type: "excel",
          data: {
            title: "Exportación completada",
            body: "Haga clic aquí para descargar su archivo.",
            link: signedUrl,
            textButton: "Descargar",
          },
          extras: {
            isRead: false,
            globalChannel: false,
            userId,
          },
        }),
      };

      await sqsClient.send(new SendMessageCommand(sqsAblyParams));
      console.log("Message sent to SQS (Ably) successfully");

      // Send a message to the SQS queue for email notifications
      if (email) {
        const sqsEmailParams = {
          QueueUrl: process.env.SQS_QUEUE_URL_EMAIL,
          MessageBody: JSON.stringify({
            type: "email",
            data: {
              to: email,
              subject: "Tu exportación está lista",
              text: `Hola, tu archivo exportado está disponible para descargar. Haz clic en el siguiente enlace: ${signedUrl}`,
              html: `<p>Hola,</p><p>Tu archivo exportado está disponible para descargar. Haz clic en el siguiente enlace: <a href="${signedUrl}">Descargar</a></p>`,
            },
          }),
        };

        await sqsClient.send(new SendMessageCommand(sqsEmailParams));
        console.log("Message sent to SQS (Email) successfully");
      }
    }
  } catch (error) {
    console.error("Error during the export process:", error);
  }
};
