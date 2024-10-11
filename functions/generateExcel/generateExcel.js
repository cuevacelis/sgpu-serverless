import ExcelJS from "exceljs";

/**
 * Función para generar un archivo Excel con estilos en la primera fila
 * @param {DynamicObject[]} data - Los datos que se escribirán en el archivo Excel
 * @param {string} nameFile - El nombre del archivo (sin extensión)
 * @param {string} [nameSheet=Sheet1] - El nombre de la hoja dentro del archivo Excel
 * @returns {Buffer} - Devuelve un buffer con el contenido del archivo Excel
 */
export async function generateExcel(data, nameSheet = "Excel") {
  // Crear un nuevo workbook (archivo Excel)
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(nameSheet);

  // Añadir los datos a la hoja
  const columns = Object.keys(data[0] || {});
  worksheet.columns = columns.map((col) => ({
    header: col,
    key: col,
    width: 15, // Ajusta el ancho de las columnas si es necesario
  }));

  // Añadir las filas con los datos
  data.forEach((row) => {
    worksheet.addRow(row);
  });

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

  // Generar el archivo Excel como un buffer
  const buffer = await workbook.xlsx.writeBuffer();

  // Devuelve el buffer para que pueda ser subido a S3
  return buffer;
}
