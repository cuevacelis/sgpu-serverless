import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { SQSEvent } from "aws-lambda";
import { generatePdf } from "./generatePdf";

const s3Client = new S3Client({ region: "us-east-1" });
const sqsClient = new SQSClient({ region: "us-east-1" });

export const handler = async (event: SQSEvent) => {
  try {
    for (const record of event.Records) {
      const messageBody = JSON.parse(record.body);
      const { type, dataSend } = messageBody;
      const { data, prefixNameFile, userId, email } = dataSend;

      if (type !== "pdf-export" || !data || !prefixNameFile) {
        console.error("Invalid message type or missing data");
        continue;
      }

      // Generar el PDF
      const pdfBuffer = await generatePdf(data);

      const bucketName = process.env.S3_BUCKET_NAME;
      const fileName = `${prefixNameFile}-${Date.now()}.pdf`;

      const putCommand = new PutObjectCommand({
        Bucket: bucketName,
        Key: fileName,
        Body: pdfBuffer,
        ContentType: "application/pdf",
      });

      await s3Client.send(putCommand);

      const signedUrl = await getSignedUrl(
        s3Client,
        new GetObjectCommand({ Bucket: bucketName, Key: fileName }),
        { expiresIn: 604800 }
      );

      if (email) {
        const sqsEmailParams = {
          QueueUrl: process.env.SQS_QUEUE_URL_EMAIL,
          MessageBody: JSON.stringify({
            type: "email",
            data: {
              to: email,
              subject: "PDF listo para descargar",
              text: `Descarga tu PDF aquí: ${signedUrl}`,
              html: `<p>Descarga tu PDF aquí: <a href="${signedUrl}">Descargar</a></p>`,
            },
          }),
        };
        await sqsClient.send(new SendMessageCommand(sqsEmailParams));
      }
    }
  } catch (error) {
    console.error("Error generating PDF:", error);
  }
};
