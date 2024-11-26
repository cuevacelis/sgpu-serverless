import { PDFDocument, rgb } from "pdf-lib";

export async function generateApuPorPartidaPdf(data: any): Promise<Buffer> {
  if (!data || !data.grupo || !Array.isArray(data.partidas)) {
    throw new TypeError("Datos inválidos para el PDF de APU por Partida.");
  }

  const { grupo, partidas } = data;
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);

  const titleFontSize = 18;
  const contentFontSize = 12;
  let yCursor = 800;

  // Título
  page.drawText(`Análisis de Precios Unitarios`, {
    x: 50,
    y: yCursor,
    size: titleFontSize,
    color: rgb(0, 0, 0),
  });
  yCursor -= 30;

  // Información del grupo
  page.drawText(`Grupo: ${grupo.grupar_nombre}`, {
    x: 50,
    y: yCursor,
    size: contentFontSize,
  });
  yCursor -= 20;
  page.drawText(`Total: ${grupo.grupar_total}`, {
    x: 50,
    y: yCursor,
    size: contentFontSize,
  });
  yCursor -= 40;

  // Tabla de partidas
  page.drawText("Partidas:", { x: 50, y: yCursor, size: contentFontSize });
  yCursor -= 20;

  partidas.forEach((partida: any, index: number) => {
    page.drawText(
      `${index + 1}. ${partida.par_nombre} (${partida.unimed_nombre}) - S/. ${
        partida.par_preunitario
      }`,
      {
        x: 70,
        y: yCursor,
        size: contentFontSize,
      }
    );
    yCursor -= 20;
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
