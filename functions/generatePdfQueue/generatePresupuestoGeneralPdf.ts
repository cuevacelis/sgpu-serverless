import { TDocumentDefinitions } from "pdfmake/interfaces";
import PdfPrinter from "pdfmake";
import { join } from "path";

// Configuración de fuentes
const fonts = {
  Roboto: {
    normal: join(__dirname, "../../fonts/Roboto-Regular.ttf"),
    bold: join(__dirname, "../../fonts/Roboto-Bold.ttf"),
    italics: join(__dirname, "../../fonts/Roboto-Italic.ttf"),
    bolditalics: join(__dirname, "../../fonts/Roboto-BoldItalic.ttf"),
  },
};

// Inicializa PdfPrinter con las fuentes
const printer = new PdfPrinter(fonts);

// Función para generar el PDF
export const generatePresupuestoGeneralPdf = async (data: any) => {
  if (!data) {
    throw new Error("Datos inválidos para generar el PDF.");
  }
  console.log("Data generatePresupuestoGeneralPdf");
  console.log(data);

  const gruposPartida = data.grupos_partida || []; // Asegúrate de que siempre sea un array

  let tableBody: any[] = [];
  let subtotal = 0;

  // Agregar encabezado de la tabla
  tableBody.push([
    { text: "Item", bold: true },
    { text: "Descripción", bold: true },
    { text: "Und", bold: true },
    { text: "Precio", bold: true },
  ]);

  // Generar filas de la tabla
  gruposPartida.forEach((grupo: any, index: number) => {
    // Validar que hijos_g1 exista y sea un array
    if (Array.isArray(grupo.hijos_g1)) {
      grupo.hijos_g1.forEach((hijo: any, hijoIndex: number) => {
        // Validar que partidas exista y sea un array
        if (Array.isArray(hijo.partidas)) {
          hijo.partidas.forEach((partida: any, partidaIndex: number) => {
            const item = `${index + 1}.${hijoIndex + 1}.${partidaIndex + 1}`;
            tableBody.push([
              { text: item, fontSize: 8 },
              { text: partida.par_nombre, fontSize: 8 },
              { text: partida.unimed_nombre || "-", fontSize: 8 },
              {
                text: partida.par_preunitario
                  ? partida.par_preunitario.toFixed(2)
                  : "0.00",
                fontSize: 8,
              },
            ]);
            subtotal += partida.par_preunitario || 0;
          });
        }
      });
    }
  });

  console.log("Table body");
  console.log(tableBody);

  // Calcular IGV y Total
  const igv = subtotal * 0.18;
  const total = subtotal + igv;

  // Agregar fila de subtotales al final
  tableBody.push(
    [
      { text: "Subtotal", colSpan: 3, alignment: "right", fontSize: 8 },
      {},
      {},
      { text: subtotal.toFixed(2), fontSize: 8 },
    ],
    [
      { text: "IGV (18%)", colSpan: 3, alignment: "right", fontSize: 8 },
      {},
      {},
      { text: igv.toFixed(2), fontSize: 8 },
    ],
    [
      {
        text: "Total",
        colSpan: 3,
        alignment: "right",
        fontSize: 8,
        bold: true,
      },
      {},
      {},
      { text: total.toFixed(2), fontSize: 8, bold: true },
    ]
  );

  // Definición del documento
  const docDefinition: TDocumentDefinitions = {
    content: [
      { text: "Presupuesto General", style: "header" },
      { text: `Proyecto: ${data.pre_nombre}`, style: "subheader" },
      { text: `Cliente: ${data.cli_nomaperazsocial}`, style: "subheader" },
      {
        text: `Ubicación: ${data.dist_nombre}, ${data.prov_nombre}, ${data.dep_nombre}, ${data.pai_nombre}`,
        style: "subheader",
      },
      {
        text: `Fecha: ${new Date(
          data.pre_fechorregistro
        ).toLocaleDateString()}`,
        style: "subheader",
      },
      { text: "\n" },
      {
        table: {
          headerRows: 1,
          widths: ["auto", "*", "auto", "auto"],
          body: tableBody,
        },
      },
    ],
    styles: {
      header: {
        fontSize: 14,
        bold: true,
        alignment: "center",
      },
      subheader: {
        fontSize: 10,
        margin: [0, 5, 0, 5],
      },
    },
    defaultStyle: {
      font: "Roboto",
    },
  };

  // Crear el documento PDF
  const pdfDoc = printer.createPdfKitDocument(docDefinition);

  // Convertir a Buffer
  const chunks: Buffer[] = [];
  return new Promise<Buffer>((resolve, reject) => {
    pdfDoc.on("data", (chunk) => chunks.push(chunk));
    pdfDoc.on("end", () => resolve(Buffer.concat(chunks)));
    pdfDoc.on("error", (err) => reject(err));
    pdfDoc.end();
  });
};
