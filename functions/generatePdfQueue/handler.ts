import { SQSEvent } from "aws-lambda";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { generatePresupuestoGeneralPdf } from "./generatePresupuestoGeneralPdf";
import { generateApuPorPartidaPdf } from "./generateApuPorPartdiaPdf";
import { generateGeneralPdf } from "./generateGeneralPdf";

const s3Client = new S3Client({ region: "us-east-1" });
const sqsClient = new SQSClient({ region: "us-east-1" });

export const handler = async (event: SQSEvent) => {
  try {
    for (const record of event.Records) {
      const messageBody = JSON.parse(record.body);
      const { type, dataSend } = messageBody;

      if (!type || !dataSend) {
        console.error("Faltan parámetros necesarios: type o dataSend.");
        continue;
      }

      const { data, prefixNameFile, userId, email } = dataSend;

      let pdfData: Buffer;

      // Seleccionar la función específica para la generación del PDF
      switch (type) {
        case "presupuesto-general":
          pdfData = await generatePresupuestoGeneralPdf(data);
          break;

        case "apu-por-partida":
          pdfData = await generateApuPorPartidaPdf(data);
          break;

        case "general":
          pdfData = await generateGeneralPdf(data);
          break;

        default:
          console.error("Tipo de PDF no soportado:", type);
          continue;
      }

      // Generar PDF
      console.log("Generando PDF");
      console.log(data);

      // Subir PDF a S3
      const bucketName = process.env.S3_BUCKET_NAME!;
      const fileName = `${prefixNameFile}-${Date.now()}.pdf`;

      const putCommand = new PutObjectCommand({
        Bucket: bucketName,
        Key: fileName,
        Body: pdfData,
        ContentType: "application/pdf",
      });

      await s3Client.send(putCommand);

      // Generar URL firmada
      const signedUrl = await getSignedUrl(
        s3Client,
        new GetObjectCommand({
          Bucket: bucketName,
          Key: fileName,
        }),
        { expiresIn: 604800 }
      );

      // Notificación a SQS Ably
      const sqsAblyParams = {
        QueueUrl: process.env.SQS_QUEUE_URL_ABLY!,
        MessageBody: JSON.stringify({
          type: "pdf",
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

      // Notificación a SQS Email
      if (email) {
        const sqsEmailParams = {
          QueueUrl: process.env.SQS_QUEUE_URL_EMAIL!,
          MessageBody: JSON.stringify({
            type: "email",
            data: {
              to: email,
              subject: "Tu exportación está lista",
              text: `Hola, tu archivo exportado está disponible para descargar: ${signedUrl}`,
              html: `<p>Hola,</p><p>Tu archivo exportado está disponible para descargar. Haz clic aquí: <a href="${signedUrl}">Descargar</a></p>`,
            },
          }),
        };

        await sqsClient.send(new SendMessageCommand(sqsEmailParams));
      }
    }
  } catch (error) {
    console.error("Error durante la generación de PDF:", error);
  }
};
