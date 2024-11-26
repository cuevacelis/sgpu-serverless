import { PDFDocument, rgb } from "pdf-lib";

/**
 * Genera un archivo PDF basado en los datos proporcionados.
 * @param data - Datos que se incluirán en el PDF.
 * @returns {Promise<Buffer>} - Un buffer con el contenido del PDF.
 */
export async function generatePdf(data: any): Promise<Buffer> {
  // Crear un nuevo documento PDF
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage();

  // Ajustar el tamaño y las posiciones iniciales
  const { width, height } = page.getSize();
  let cursorY = height - 50; // Margen superior

  // Título del documento
  page.drawText("Presupuesto General", {
    x: 50,
    y: cursorY,
    size: 18,
    color: rgb(0, 0.53, 0.71), // Azul
  });

  cursorY -= 30; // Mover el cursor hacia abajo

  // Recorrer los datos para agregarlos al PDF
  data.forEach((item: any) => {
    const text = `${item.title}: ${item.value}`;
    page.drawText(text, {
      x: 50,
      y: cursorY,
      size: 12,
      color: rgb(0, 0, 0),
    });

    cursorY -= 20;

    if (cursorY < 50) {
      // Añadir una nueva página si no hay espacio
      cursorY = height - 50;
      pdfDoc.addPage();
    }
  });

  // Finalizar el PDF
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
