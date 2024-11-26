import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { sql } from "kysely";
import getDbPostgres from "../../db/db-postgres";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

const lambdaClient = new LambdaClient({ region: "us-east-1" });

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const { pre_id, userId, prefixNameFile, email } = JSON.parse(
      event.body || "{}"
    );

    if (!pre_id || !userId || !prefixNameFile) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error:
            "Los parámetros 'pre_id', 'userId' y 'prefixNameFile' son obligatorios.",
        }),
      };
    }

    // Consulta a la función de PostgreSQL
    const resultSQL = await getDbPostgres()
      .selectFrom(
        sql<any>`sp_presupuesto_obten_exportar(${pre_id})`.as("result")
      )
      .selectAll()
      .execute();

    if (!resultSQL || resultSQL.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          error: "No se encontró información para el presupuesto general.",
        }),
      };
    }

    // Obtener la data del resultado
    const presupuestoData = resultSQL[0]?.result?.data;

    // Validar que exista la data esperada
    if (!presupuestoData || presupuestoData.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          error: "No se encontraron datos en el presupuesto exportado.",
        }),
      };
    }

    const presupuesto = presupuestoData[0]; // Primer presupuesto
    const payload = {
      Records: [
        {
          body: JSON.stringify({
            type: "presupuesto-general",
            dataSend: {
              data: presupuesto,
              prefixNameFile: `PRESUPUESTO GENERAL ${prefixNameFile}`,
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
