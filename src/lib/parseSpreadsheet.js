import * as XLSX from "xlsx";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

/**
 * Maps canonical field names to all accepted header aliases.
 * All aliases are matched after normalizeHeader() is applied
 * (i.e. they must already be in snake_case / lowercase form).
 */
const COLUMN_MAP = {
  year:               ["year"],
  zone:               ["zone"],
  state:              ["state"],
  // commodity_name accepts several alternate column names
  commodity_name:     ["commodity_name", "commodity", "description", "product_name"],
  // category accepts alternate grouping column names
  category:           ["category", "commodity_category", "product_category"],
  // unit_of_measurement accepts several abbreviations
  unit_of_measurement: ["unit_of_measurement", "unit", "measurement_unit"],
  january:            ["january", "jan"],
  february:           ["february", "feb"],
  march:              ["march", "mar"],
  april:              ["april", "apr"],
  may:                ["may"],
  june:               ["june", "jun"],
  july:               ["july", "jul"],
  august:             ["august", "aug"],
  september:          ["september", "sep", "sept"],
  october:            ["october", "oct"],
  november:           ["november", "nov"],
  december:           ["december", "dec"],
  total:              ["total"],
  average:            ["average", "avg"],
};

/**
 * Lightweight commodity-name → category lookup table for Nigerian
 * agricultural produce. Used as a fallback when a file contains no
 * category column. Extend as needed.
 */
export const COMMODITY_CATEGORY_MAP = {
  // Cereals & Grains
  rice: "Cereals",
  wheat: "Cereals",
  maize: "Cereals",
  corn: "Cereals",
  millet: "Cereals",
  sorghum: "Cereals",
  guinea_corn: "Cereals",
  oat: "Cereals",
  barley: "Cereals",
  // Roots & Tubers
  cassava: "Roots & Tubers",
  yam: "Roots & Tubers",
  cocoyam: "Roots & Tubers",
  sweet_potato: "Roots & Tubers",
  irish_potato: "Roots & Tubers",
  potato: "Roots & Tubers",
  // Vegetables
  tomato: "Vegetables",
  onion: "Vegetables",
  pepper: "Vegetables",
  okra: "Vegetables",
  spinach: "Vegetables",
  carrot: "Vegetables",
  cabbage: "Vegetables",
  lettuce: "Vegetables",
  cucumber: "Vegetables",
  garden_egg: "Vegetables",
  // Oilseeds & Pulses
  groundnut: "Oilseeds",
  soybean: "Oilseeds",
  sesame: "Oilseeds",
  sunflower: "Oilseeds",
  palm_kernel: "Oilseeds",
  palm_oil: "Oilseeds",
  // Fruits
  banana: "Fruits",
  plantain: "Fruits",
  mango: "Fruits",
  orange: "Fruits",
  pineapple: "Fruits",
  watermelon: "Fruits",
  pawpaw: "Fruits",
  papaya: "Fruits",
  guava: "Fruits",
  // Legumes
  cowpea: "Legumes",
  beans: "Legumes",
  soya_beans: "Legumes",
  // Livestock & Fishery
  beef: "Livestock",
  pork: "Livestock",
  chicken: "Livestock",
  catfish: "Fishery",
  tilapia: "Fishery",
  mackerel: "Fishery",
  // Cash Crops
  cocoa: "Cash Crops",
  cotton: "Cash Crops",
  tobacco: "Cash Crops",
  rubber: "Cash Crops",
  coffee: "Cash Crops",
};

// ---------------------------------------------------------------------------
// Header normalization
// ---------------------------------------------------------------------------

/**
 * Normalise a spreadsheet header to snake_case:
 *   "Commodity Name"      → "commodity_name"
 *   "Unit of Measurement" → "unit_of_measurement"
 *   " January "           → "january"
 *   "s_no"                → "s_no"
 */
export function normalizeHeader(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s\-]+/g, "_")   // spaces & hyphens → underscore
    .replace(/_+/g, "_")        // collapse consecutive underscores
    .replace(/^_|_$/g, "");     // strip leading / trailing underscores
}

// ---------------------------------------------------------------------------
// Stage 1 — alias resolution (mapRow)
// ---------------------------------------------------------------------------

/**
 * Given a raw spreadsheet row object, resolve its headers to canonical
 * field names using COLUMN_MAP. Numeric coercion is applied for
 * year, months, total, and average.
 *
 * Returns { record, mappingsApplied }.
 */
function mapRow(rawRow) {
  // Build a lookup keyed by normalised header
  const lookup = {};
  for (const [key, value] of Object.entries(rawRow)) {
    lookup[normalizeHeader(key)] = value;
  }

  const record = {};
  const mappingsApplied = new Set();

  for (const [field, aliases] of Object.entries(COLUMN_MAP)) {
    for (const alias of aliases) {
      const normAlias = normalizeHeader(alias);
      if (lookup[normAlias] !== undefined && lookup[normAlias] !== "") {
        record[field] = lookup[normAlias];
        // Record a mapping note when the alias differs from the canonical name
        if (normAlias !== field) {
          mappingsApplied.add(`${normAlias} → ${field}`);
        }
        break;
      }
    }
  }

  // Numeric coercion
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

  // String trimming for key text fields
  for (const field of ["zone", "state", "category", "commodity_name", "unit_of_measurement"]) {
    if (record[field] !== undefined) {
      record[field] = String(record[field]).trim();
    }
  }

  return { record, mappingsApplied: [...mappingsApplied] };
}

// ---------------------------------------------------------------------------
// Stage 2 — preprocessing / fallbacks (preprocessRow)
// ---------------------------------------------------------------------------

/**
 * Apply semantic fallbacks after alias resolution:
 *  • If commodity_name is missing, use description from the raw lookup (already
 *    handled by COLUMN_MAP alias), so this stage double-checks.
 *  • If category is missing, attempt a lookup from COMMODITY_CATEGORY_MAP,
 *    otherwise default to "Uncategorized" and emit a warning.
 *
 * Returns { record, warnings }.
 */
function preprocessRow(record, rowIndex) {
  const warnings = [];

  // Fallback: commodity_name should already be resolved via "description" alias
  // in COLUMN_MAP. Nothing extra needed here — included for explicitness.
  if (!record.commodity_name) {
    // Nothing more we can do without data
  }

  // Fallback: category lookup / default
  if (!record.category) {
    const commodityKey = (record.commodity_name ?? "")
      .toLowerCase()
      .replace(/\s+/g, "_");

    const lookedUp = COMMODITY_CATEGORY_MAP[commodityKey];
    if (lookedUp) {
      record.category = lookedUp;
      warnings.push(
        `Row ${rowIndex}: category missing — inferred "${lookedUp}" from commodity lookup`
      );
    } else {
      record.category = "Uncategorized";
      warnings.push(
        `Row ${rowIndex}: category missing — defaulted to "Uncategorized"`
      );
    }
  }

  return { record, warnings };
}

// ---------------------------------------------------------------------------
// Stage 3 — validation (validateRow)
// ---------------------------------------------------------------------------

const REQUIRED = ["year", "zone", "state", "category", "commodity_name", "unit_of_measurement"];

/**
 * Validate a pre-processed row. Returns an array of error strings.
 * An empty array means the row is valid.
 */
export function validateRow(record) {
  const errors = [];

  for (const field of REQUIRED) {
    if (!record[field] && record[field] !== 0) {
      errors.push(`Missing ${field}`);
    }
  }

  if (record.year && (isNaN(record.year) || record.year < 1900 || record.year > 2100)) {
    errors.push("Invalid year");
  }

  for (const month of MONTHS) {
    if (
      record[month] !== undefined &&
      record[month] !== null &&
      record[month] !== "" &&
      isNaN(Number(record[month]))
    ) {
      errors.push(`Invalid ${month}`);
    }
  }

  return errors;
}

// ---------------------------------------------------------------------------
// Full pipeline
// ---------------------------------------------------------------------------

/**
 * Run all three stages for an array of raw row objects.
 *
 * Returns:
 * {
 *   validRecords:    Record[],   // rows that passed validation
 *   errors:          { row, errors, data }[],
 *   warnings:        string[],   // non-fatal notices
 *   summary: {
 *     totalRows, imported, skipped, warnings, mappingsApplied
 *   }
 * }
 */
function processRawRows(rawRows) {
  const validRecords = [];
  const errors = [];
  const allWarnings = [];
  const allMappings = new Set();

  rawRows.forEach((rawRow, i) => {
    const rowIndex = i + 1;

    // Stage 1: alias resolution
    const { record: mapped, mappingsApplied } = mapRow(rawRow);
    mappingsApplied.forEach((m) => allMappings.add(m));

    // Stage 2: semantic fallbacks
    const { record: processed, warnings: rowWarnings } = preprocessRow(mapped, rowIndex);
    allWarnings.push(...rowWarnings);

    // Stage 3: validation
    const rowErrors = validateRow(processed);

    if (rowErrors.length) {
      errors.push({ row: rowIndex, errors: rowErrors, data: processed });
    } else {
      validRecords.push(processed);
    }
  });

  const summary = {
    totalRows: rawRows.length,
    imported: validRecords.length,
    skipped: errors.length,
    warnings: allWarnings.length,
    mappingsApplied: [...allMappings],
  };

  return { validRecords, errors, warnings: allWarnings, summary };
}

// ---------------------------------------------------------------------------
// File reading helpers
// ---------------------------------------------------------------------------

function sheetToRows(sheet) {
  return XLSX.utils.sheet_to_json(sheet, { defval: "" });
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
        resolve(sheetToRows(sheet));
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsArrayBuffer(file);
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse a CSV or XLSX file and run the full import pipeline.
 *
 * Returns:
 * {
 *   validRecords, errors, warnings, summary
 * }
 *
 * Replaces the previous bare-array return value.
 * Callers that previously did:
 *   const records = await parseSpreadsheetFile(file);
 * should now destructure:
 *   const { validRecords, errors, warnings, summary } = await parseSpreadsheetFile(file);
 */
export async function parseSpreadsheetFile(file) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  let rawRows;

  if (extension === "csv") {
    const text = await file.text();
    const workbook = XLSX.read(text, { type: "string" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    rawRows = sheetToRows(sheet);
  } else {
    rawRows = await readWorkbook(file);
  }

  return processRawRows(rawRows);
}

/**
 * Exposed for unit-testing without a File object.
 * Accepts an array of plain row objects (as XLSX would produce).
 */
export function processRawRowsForTesting(rawRows) {
  return processRawRows(rawRows);
}
