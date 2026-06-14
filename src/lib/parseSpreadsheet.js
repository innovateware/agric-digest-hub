import * as XLSX from "xlsx";

const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

const COLUMN_MAP = {
  year: ["year"],
  zone: ["zone"],
  state: ["state"],
  category: ["category"],
  commodity_name: ["commodity name", "commodity_name", "commodity"],
  unit_of_measurement: ["unit of measurement", "unit_of_measurement", "unit"],
  january: ["january", "jan"],
  february: ["february", "feb"],
  march: ["march", "mar"],
  april: ["april", "apr"],
  may: ["may"],
  june: ["june", "jun"],
  july: ["july", "jul"],
  august: ["august", "aug"],
  september: ["september", "sep"],
  october: ["october", "oct"],
  november: ["november", "nov"],
  december: ["december", "dec"],
  total: ["total"],
  average: ["average", "avg"],
};

function normalizeHeader(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function mapRow(rawRow) {
  const normalizedEntries = Object.entries(rawRow).map(([key, value]) => [
    normalizeHeader(key),
    value,
  ]);
  const lookup = Object.fromEntries(normalizedEntries);
  const record = {};

  for (const [field, aliases] of Object.entries(COLUMN_MAP)) {
    for (const alias of aliases) {
      if (lookup[alias] !== undefined && lookup[alias] !== "") {
        record[field] = lookup[alias];
        break;
      }
    }
  }

  if (record.year !== undefined) {
    record.year = Number(record.year);
  }

  for (const month of MONTHS) {
    if (record[month] !== undefined && record[month] !== "") {
      record[month] = Number(record[month]);
    } else {
      delete record[month];
    }
  }

  if (record.total !== undefined && record.total !== "") {
    record.total = Number(record.total);
  } else {
    delete record.total;
  }

  if (record.average !== undefined && record.average !== "") {
    record.average = Number(record.average);
  } else {
    delete record.average;
  }

  for (const field of ["zone", "state", "category", "commodity_name", "unit_of_measurement"]) {
    if (record[field] !== undefined) {
      record[field] = String(record[field]).trim();
    }
  }

  return record;
}

function readWorkbook(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        resolve(rows.map(mapRow));
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
}

export async function parseSpreadsheetFile(file) {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "csv") {
    const text = await file.text();
    const workbook = XLSX.read(text, { type: "string" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
    return rows.map(mapRow);
  }

  return readWorkbook(file);
}

export { MONTHS };
