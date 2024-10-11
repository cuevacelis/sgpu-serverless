import Ably from "ably";
import { SQSEvent } from "aws-lambda";

// Lambda genérico que maneja diferentes tipos de notificaciones
export const handler = async (event: SQSEvent) => {
  const ably = new Ably.Realtime({ key: process.env.ABLY_API_KEY });

  try {
    // Iterar sobre cada mensaje recibido en el evento
    for (const record of event.Records) {
      const messageBody = JSON.parse(record.body);
      const { type, data = {}, extras = {} } = messageBody;

      // Desestructuramos los datos obligatorios y opcionales
      const { title, body, link = "", textButton = "Ir", action = null } = data;

      const { isRead = false, globalChannel = false, userId } = extras;

      // Validar campos obligatorios
      if (!title || !body) {
        console.error("Título y cuerpo son obligatorios.");
        continue;
      }

      if (!userId) {
        console.error("El identificador del usuario es obligatorio.");
        continue;
      }

      // Obtener el canal dinámico basado en el tipo de notificación
      const userChannel = ably.channels.get(`notifications`);

      // Publicar la notificación en Ably
      await userChannel.publish({
        name: type,
        data: { title, body, link, textButton, action },
        extras: {
          headers: { isRead, userId, globalChannel },
        },
      });
    }
  } catch (error) {
    console.error("Error enviando notificación a Ably:", error);
  } finally {
    // Cerrar la conexión de Ably al final
    await ably.connection.close();
  }
};
