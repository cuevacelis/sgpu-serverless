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
    const { grupar_id } = JSON.parse(event.body || "{}");

    if (!grupar_id) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error: "El parámetro 'grupar_id' es obligatorio.",
        }),
      };
    }

    const grupoDePartida = await getDbPostgres()
      .selectFrom(
        sql<any>`sp_grupo_partida_obten_x_id(${grupar_id})`.as(
          "result"
        )
      )
      .selectAll()
      .execute();

    if (!grupoDePartida || grupoDePartida.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          error: "No se encontró información para el grupo de partida.",
        }),
      };
    }

    const payload = {
      Records: [
        {
          body: JSON.stringify({
            type: "pdf-export",
            dataSend: {
              data: grupoDePartida[0],
              prefixNameFile: `${grupoDePartida[0].grupar_nombre}.pdf`,
            },
          }),
        },
      ],
    };

    const command = new InvokeCommand({
      FunctionName: "sgpu-serverless-dev-generatePdfQueue",
      InvocationType: "Event",
      Payload: Buffer.from(JSON.stringify(payload)),
    });

    await lambdaClient.send(command);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `El PDF del grupo de partida ${grupoDePartida[0].grupar_nombre} está en proceso.`,
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
