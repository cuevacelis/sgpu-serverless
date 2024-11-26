import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { sql } from "kysely";
import getDbPostgres from "../../db/db-postgres";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

const lambdaClient = new LambdaClient({ region: "us-east-1" });

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const { grupar_id, userId, email } = JSON.parse(event.body || "{}");

    if (!grupar_id || !userId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "Los parámetros 'grupar_id' y 'userId' son obligatorios.",
        }),
      };
    }

    // Obtener los datos del grupo de partida
    const grupo = await getDbPostgres()
      .selectFrom(
        sql<any>`sp_grupo_partida_obten_x_presupuesto_x_grupo_partida_v4(${grupar_id})`.as(
          "result"
        )
      )
      .selectAll()
      .execute();

    if (!grupo || grupo.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          error: "No se encontraron datos para el grupo de partida.",
        }),
      };
    }

    // Obtener las partidas asociadas al grupo de partida
    const partidas = await getDbPostgres()
      .selectFrom(sql<any>`sp_partida_obten_x_grupo(${grupar_id})`.as("result"))
      .selectAll()
      .execute();

    const data = {
      grupo: grupo[0],
      partidas,
    };

    const payload = {
      Records: [
        {
          body: JSON.stringify({
            type: "apu-por-partida",
            dataSend: {
              data,
              prefixNameFile: `${grupo[0].grupar_id} ${grupo[0].grupar_nombre}.pdf`,
              userId,
              email,
            },
          }),
        },
      ],
    };

    // Invocar a la función Lambda `generatePdfQueue`
    const command = new InvokeCommand({
      FunctionName: "sgpu-serverless-dev-generatePdfQueue",
      InvocationType: "Event",
      Payload: Buffer.from(JSON.stringify(payload)),
    });

    await lambdaClient.send(command);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `El APU del grupo de partida está en proceso.`,
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
