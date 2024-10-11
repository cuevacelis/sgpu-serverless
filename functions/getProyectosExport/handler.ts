// handler.ts
import { APIGatewayProxyEvent } from "aws-lambda";
import { sql } from "kysely";
import getDbPostgres from "../../db/db-postgres";
import { LambdaClient, InvokeCommand } from "@aws-sdk/client-lambda";

const lambdaClient = new LambdaClient({ region: "us-east-1" });

export const handler = async (event: APIGatewayProxyEvent) => {
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
        sql`
        SELECT * FROM sp_presupuesto_obten_paginadov3_vusuario(
          ${userId},
          ${100},
          ${0},
          ${""}
        )
      `.as("result")
      )
      .selectAll()
      .execute();

    try {
      const command = new InvokeCommand({
        FunctionName: "sgpu-serverless-dev-generateExcelQueue",
        InvocationType: "Event",
        Payload: Buffer.from(
          JSON.stringify({
            Records: [
              {
                body: JSON.stringify({
                  type: "excel-export",
                  dataSend: {
                    data: resultSQL.map((object: any) => ({
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
          })
        ),
      });
      const response = await lambdaClient.send(command);
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
