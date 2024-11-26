import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { sql } from "kysely";
import getDbPostgres from "../../db/db-postgres";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
// import { IDataDBObtenerGruposDePartidasId } from "../../lib/types/types";

const lambdaClient = new LambdaClient({ region: "us-east-1" });

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const { pre_id } = JSON.parse(event.body || "{}");

    if (!pre_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "El parámetro 'pre_id' es obligatorio.",
        }),
      };
    }

    const gruposDePartida = await getDbPostgres()
      .selectFrom(
        sql<any>`sp_grupo_partida_obten_x_presupuesto(${pre_id})`.as("result")
      )
      .selectAll()
      .execute();

    if (!gruposDePartida || gruposDePartida.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          error: "No se encontraron grupos de partida para el presupuesto.",
        }),
      };
    }

    const invokePromises = gruposDePartida.map(async (grupo) => {
      const payload = { grupar_id: grupo.grupar_id };

      const command = new InvokeCommand({
        FunctionName: "sgpu-serverless-dev-getApuPorPartdiaExport",
        InvocationType: "Event", // Asíncrono
        Payload: Buffer.from(JSON.stringify(payload)),
      });

      return lambdaClient.send(command);
    });

    await Promise.all(invokePromises);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Todos los PDFs de grupos de partida están en proceso.",
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
