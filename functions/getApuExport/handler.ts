import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { sql } from "kysely";
import getDbPostgres from "../../db/db-postgres";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

const lambdaClient = new LambdaClient({ region: "us-east-1" });

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const { pre_id, userId, email } = JSON.parse(event.body || "{}");

    if (!pre_id || !userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Los parámetros 'pre_id' y 'userId' son obligatorios.",
        }),
      };
    }

    // Obtener los grupos de partidas principales para el presupuesto
    const grupos = await getDbPostgres()
      .selectFrom(
        sql<any>`sp_grupo_partida_obten_x_presupuesto(${pre_id})`.as("result")
      )
      .selectAll()
      .execute();

    if (!grupos || grupos.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          error: "No se encontraron grupos de partidas para el presupuesto.",
        }),
      };
    }

    // Procesar cada grupo de partida
    for (const grupo of grupos) {
      const payload = {
        grupar_id: grupo.grupar_id,
        userId,
        email,
      };

      const command = new InvokeCommand({
        FunctionName: "sgpu-serverless-dev-getApuPorPartdiaExport",
        InvocationType: "Event",
        Payload: Buffer.from(JSON.stringify(payload)),
      });

      await lambdaClient.send(command);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Los procesos para generar los APUs están en ejecución.",
      }),
    };
  } catch (error) {
    console.error("Error en el handler:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Error interno del servidor." }),
    };
  }
};
