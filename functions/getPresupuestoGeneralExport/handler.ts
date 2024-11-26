import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { sql } from "kysely";
import getDbPostgres from "../../db/db-postgres";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
// import { ISpPresupuestoGeneral } from "../../lib/types/types";

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

    const presupuestoGeneral = await getDbPostgres()
      .selectFrom(
        sql<any>`sp_presupuesto_general_obten(${pre_id})`.as("result")
      )
      .selectAll()
      .execute();

    if (!presupuestoGeneral || presupuestoGeneral.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          error: "No se encontró información para el presupuesto general.",
        }),
      };
    }

    const payload = {
      Records: [
        {
          body: JSON.stringify({
            type: "pdf-export",
            dataSend: {
              data: presupuestoGeneral[0],
              prefixNameFile: `PRESUPUESTO GENERAL ${presupuestoGeneral[0].pre_nombre}.pdf`,
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
        message: `El PDF del presupuesto general está en proceso.`,
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
