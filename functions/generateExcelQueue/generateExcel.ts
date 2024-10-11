import ExcelJS from "exceljs";
import { WritableStreamBuffer } from "stream-buffers";

/**
 * Función para generar un archivo Excel con estilos en la primera fila utilizando modo streaming
 * @param {any[]} data - Los datos que se escribirán en el archivo Excel
 * @param {string} [nameSheet='Sheet1'] - El nombre de la hoja dentro del archivo Excel
 * @returns {Promise<Buffer>} - Devuelve un buffer con el contenido del archivo Excel
 */
export async function generateExcel(
  data: any[],
  nameSheet = "Excel"
): Promise<Buffer> {
  // Crear un stream en memoria
  const writableStreamBuffer = new WritableStreamBuffer({
    initialSize: 100 * 1024, // 100 KB
    incrementAmount: 100 * 1024, // crece en incrementos de 100 KB
  });

  // Crear un nuevo workbook en modo streaming y especificar el stream
  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
    stream: writableStreamBuffer,
    useSharedStrings: true,
    useStyles: true,
  });

  const worksheet = workbook.addWorksheet(nameSheet);

  // Añadir los encabezados
  const columns = Object.keys(data[0] || {});
  worksheet.columns = columns.map((col) => ({
    header: col,
    key: col,
    width: 15,
  }));

  // Aplicar estilo a la primera fila (encabezados)
  const firstRow = worksheet.getRow(1);
  firstRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "ADADAD" },
    };
    cell.font = {
      color: { argb: "FFFFFFFF" },
      bold: true,
    };
  });
  firstRow.commit();

  // Añadir las filas de datos
  for (const row of data) {
    worksheet.addRow(row).commit();
  }

  // Finalizar la hoja y el workbook
  worksheet.commit();
  await workbook.commit();

  // Devolver el buffer con el contenido del archivo Excel
  return writableStreamBuffer.getContents() as Buffer;
}
