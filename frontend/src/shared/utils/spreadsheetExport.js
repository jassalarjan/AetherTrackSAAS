const FORMULA_PREFIX = /^[=+\-@]/;

const loadExcelJS = async () => {
  const module = await import('exceljs');
  return module.default;
};

const sanitizeSpreadsheetValue = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeSpreadsheetValue(item)).join(', ');
  }

  if (typeof value === 'object') {
    return JSON.stringify(value);
  }

  const text = String(value);
  return FORMULA_PREFIX.test(text) ? `'${text}` : text;
};

const sanitizeSpreadsheetRow = (row) => {
  if (!row || typeof row !== 'object') {
    return row;
  }

  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [key, sanitizeSpreadsheetValue(value)])
  );
};

export const sanitizeSpreadsheetData = (rows = []) => {
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows.map((row) => sanitizeSpreadsheetRow(row));
};

export const createWorkbook = async () => {
  const ExcelJS = await loadExcelJS();
  return new ExcelJS.Workbook();
};

export const addWorksheetFromRows = (workbook, sheetName, rows = [], columnWidths = []) => {
  const sanitizedRows = sanitizeSpreadsheetData(rows);
  const worksheet = workbook.addWorksheet(sheetName);

  const headers = Array.from(
    sanitizedRows.reduce((set, row) => {
      Object.keys(row || {}).forEach((key) => set.add(key));
      return set;
    }, new Set())
  );

  worksheet.columns = headers.map((header, index) => ({
    header,
    key: header,
    width: Number.isFinite(columnWidths[index]) ? columnWidths[index] : Math.max(12, String(header).length + 2),
  }));

  sanitizedRows.forEach((row) => {
    const rowData = {};
    headers.forEach((header) => {
      rowData[header] = row?.[header] ?? '';
    });
    worksheet.addRow(rowData);
  });

  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };

  return worksheet;
};

export const downloadWorkbook = async (workbook, filename) => {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.URL.revokeObjectURL(url);
};
