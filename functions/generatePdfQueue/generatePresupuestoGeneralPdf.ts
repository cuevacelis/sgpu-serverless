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

  const gruposPartida = data.grupos_partida || []; // Asegurar que siempre sea un array

  let tableBody: any[] = [];
  let subtotal = 0;

  // Agregar encabezado de la tabla
  tableBody.push([
    { text: "Item", bold: true },
    { text: "Descripción", bold: true },
    { text: "Und", bold: true },
    { text: "Precio", bold: true },
  ]);

  // Función recursiva para generar las filas
  const processGrupo = (
    grupo: any,
    parentItem: string = "",
    level: number = 1
  ) => {
    const currentItem = parentItem
      ? `${parentItem}.${String(level).padStart(2, "0")}`
      : String(level).padStart(2, "0");

    // Agregar el grupo al cuerpo de la tabla
    tableBody.push([
      { text: currentItem, fontSize: 8, bold: true },
      { text: grupo.grupar_nombre, fontSize: 8, bold: true },
      { text: "", fontSize: 8 },
      { text: "", fontSize: 8 },
    ]);

    // Si el grupo tiene partidas, agrégalas
    if (Array.isArray(grupo.partidas)) {
      grupo.partidas.forEach((partida: any, index: number) => {
        const partidaItem = `${currentItem}.${String(index + 1).padStart(
          2,
          "0"
        )}`;
        tableBody.push([
          { text: partidaItem, fontSize: 8 },
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

    // Procesar los subgrupos (hijos)
    if (Array.isArray(grupo.hijos_g1)) {
      grupo.hijos_g1.forEach((hijo: any, index: number) =>
        processGrupo(hijo, currentItem, index + 1)
      );
    }
    if (Array.isArray(grupo.hijos_g2)) {
      grupo.hijos_g2.forEach((hijo: any, index: number) =>
        processGrupo(hijo, currentItem, index + 1)
      );
    }
    if (Array.isArray(grupo.hijos_g3)) {
      grupo.hijos_g3.forEach((hijo: any, index: number) =>
        processGrupo(hijo, currentItem, index + 1)
      );
    }
    if (Array.isArray(grupo.hijos_g4)) {
      grupo.hijos_g4.forEach((hijo: any, index: number) =>
        processGrupo(hijo, currentItem, index + 1)
      );
    }
  };

  // Procesar todos los grupos de partida
  gruposPartida.forEach((grupo: any, index: number) =>
    processGrupo(grupo, "", index + 1)
  );

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
