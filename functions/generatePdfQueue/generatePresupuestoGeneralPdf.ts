import PdfPrinter from "pdfmake";
import { TDocumentDefinitions } from "pdfmake/interfaces";
import { join } from "path";
import { promises as fs } from "fs";

/**
 * Genera un PDF con el formato de Presupuesto General.
 *
 * @param data - Datos para generar el PDF.
 * @returns Buffer del archivo PDF.
 */
export async function generatePresupuestoGeneralPdf(
  data: any
): Promise<Buffer> {
  if (!data) {
    throw new Error("Datos inválidos para generar el PDF.");
  }

  // Fuentes personalizadas
  const fonts = {
    Roboto: {
      normal: join(__dirname, "../../fonts/Roboto-Regular.ttf"),
      bold: join(__dirname, "../../fonts/Roboto-Bold.ttf"),
      italics: join(__dirname, "../../fonts/Roboto-Italic.ttf"),
      bolditalics: join(__dirname, "../../fonts/Roboto-BoldItalic.ttf"),
    },
  };

  const printer = new PdfPrinter(fonts);

  // Definición del contenido del PDF
  const docDefinition: TDocumentDefinitions = {
    pageSize: "A4",
    pageMargins: [40, 60, 40, 60],
    content: [
      { text: "Presupuesto General", style: "header" },
      { text: `Nombre del Proyecto: ${data.pre_nombre}`, style: "subheader" },
      { text: `Cliente: ${data.cli_nomaperazsocial}`, style: "subheader" },
      {
        text: `Ubicación: ${data.dist_nombre}, ${data.prov_nombre}, ${data.dep_nombre}, ${data.pai_nombre}`,
        style: "subheader",
      },
      {
        text: `Fecha de Registro: ${new Date(
          data.pre_fechorregistro
        ).toLocaleDateString("es-PE")}`,
        style: "subheader",
      },
      { text: "Grupos de Partida", style: "sectionHeader" },
      {
        table: {
          headerRows: 1,
          widths: ["*", "auto", "auto"],
          body: [
            [
              { text: "Nombre del Grupo", style: "tableHeader" },
              { text: "ID", style: "tableHeader" },
              { text: "Partidas", style: "tableHeader" },
            ],
            ...data.grupos_partida.map((grupo: any) => [
              grupo.grupar_nombre,
              grupo.grupar_id,
              grupo.partidas ? grupo.partidas.length : "N/A",
            ]),
          ],
        },
        layout: "lightHorizontalLines",
      },
      { text: "\n" },
      { text: "Resumen", style: "sectionHeader" },
      {
        columns: [
          { text: `Jornal: ${data.pre_jornal}`, width: "50%" },
          {
            text: `Estado: ${data.pre_estado === 1 ? "Activo" : "Inactivo"}`,
            width: "50%",
          },
        ],
      },
    ],
    styles: {
      header: {
        fontSize: 18,
        bold: true,
        alignment: "center",
        margin: [0, 0, 0, 20],
      },
      subheader: {
        fontSize: 12,
        margin: [0, 10, 0, 5],
      },
      sectionHeader: {
        fontSize: 14,
        bold: true,
        margin: [0, 20, 0, 10],
      },
      tableHeader: {
        bold: true,
        fontSize: 12,
        color: "black",
        fillColor: "#eeeeee",
        alignment: "center",
      },
    },
  };

  // Crear el PDF
  const pdfDoc = printer.createPdfKitDocument(docDefinition);

  // Convertir a Buffer
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    pdfDoc.on("data", (chunk) => chunks.push(chunk));
    pdfDoc.on("end", () => resolve(Buffer.concat(chunks)));
    pdfDoc.on("error", (err) => reject(err));
    pdfDoc.end();
  });
}
