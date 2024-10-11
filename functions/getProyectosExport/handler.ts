import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { sql } from "kysely";
import getDbPostgres from "../../db/db-postgres";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";
import { ISpPresupuestoObtenPaginado } from "../../lib/types/types";

const lambdaClient = new LambdaClient({ region: "us-east-1" });

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const { userId, prefixNameFile, email } = JSON.parse(event.body || "{}");

    if (!userId || !prefixNameFile || !email) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          error:
            "Los parámetros userId, prefixNameFile y email son obligatorios.",
        }),
      };
    }

    const resultSQL = await getDbPostgres()
      .selectFrom(
        sql<ISpPresupuestoObtenPaginado>`sp_presupuesto_obten_paginadov3_vusuario(
          ${Number(userId)},
          ${100},
          ${1},
          ${""}
        )`.as("result")
      )
      .selectAll()
      .execute();

    // Verificar si resultSQL tiene datos
    if (!resultSQL || resultSQL.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({
          error: "No se encontraron presupuestos para exportar.",
        }),
      };
    }

    try {
      const payload = {
        Records: [
          {
            body: JSON.stringify({
              type: "excel-export",
              dataSend: {
                data: resultSQL[0]?.result?.data.map((object) => ({
                  Código: object.pre_codigo || "",
                  Usuario: object.usu_nomapellidos,
                  Nombre: object.pre_nombre,
                  "Razón social": object.cli_nomaperazsocial,
                  Jornal: object.pre_jornal,
                  Fecha: object.pre_fechorregistro,
                })),
                userId: userId,
                prefixNameFile: prefixNameFile,
                email: email,
              },
            }),
          },
        ],
      };

      const command = new InvokeCommand({
        FunctionName: "sgpu-serverless-dev-generateExcelQueue",
        InvocationType: "Event", // Asíncrono
        Payload: Buffer.from(JSON.stringify(payload)),
      });

      await lambdaClient.send(command);
    } catch (error) {
      console.error("Error al invocar la Lambda queueS3:", error);
      throw error;
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "ok" }),
    };
  } catch (error) {
    console.error("Error en el handler:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Error interno del servidor" }),
    };
  }
};
