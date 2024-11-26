import { PDFDocument, rgb } from "pdf-lib";

export async function generateGeneralPdf(data: any): Promise<Buffer> {
  if (!data) {
    throw new TypeError("Datos inválidos para el PDF General.");
  }

  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([595.28, 841.89]);

  const titleFontSize = 18;
  const contentFontSize = 12;
  let yCursor = 800;

  // Título genérico
  page.drawText(`Reporte General`, { x: 50, y: yCursor, size: titleFontSize });
  yCursor -= 30;

  // Agregar los datos dinámicamente
  Object.entries(data).forEach(([key, value]) => {
    if (yCursor < 50) {
      page = pdfDoc.addPage([595.28, 841.89]); // Nueva página
      yCursor = 800;
    }

    page.drawText(`${key}: ${JSON.stringify(value)}`, {
      x: 50,
      y: yCursor,
      size: contentFontSize,
    });
    yCursor -= 20;
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
