/**
 * Unit tests for parseSpreadsheet.js
 *
 * Run with: npm run test
 *
 * These tests use processRawRowsForTesting() which accepts plain row objects
 * (as XLSX.utils.sheet_to_json would produce), bypassing File I/O entirely.
 * XLSX-based tests construct an in-memory workbook and convert it to rows.
 */

import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import {
  normalizeHeader,
  validateRow,
  processRawRowsForTesting,
  COMMODITY_CATEGORY_MAP,
} from "./parseSpreadsheet.js";

// ---------------------------------------------------------------------------
// Helper — build raw rows from an array of header→value objects
// ---------------------------------------------------------------------------

function makeRows(headers, dataRows) {
  return dataRows.map((values) => {
    const row = {};
    headers.forEach((h, i) => { row[h] = values[i] ?? ""; });
    return row;
  });
}

/**
 * Simulate what XLSX.utils.sheet_to_json produces for a CSV/XLSX file.
 * Creates an in-memory workbook and extracts rows, mirroring the real pipeline.
 */
function xlsxRoundTrip(headers, dataRows) {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  const wb2 = XLSX.read(buf, { type: "array" });
  return XLSX.utils.sheet_to_json(wb2.Sheets[wb2.SheetNames[0]], { defval: "" });
}

// ---------------------------------------------------------------------------
// normalizeHeader
// ---------------------------------------------------------------------------

describe("normalizeHeader", () => {
  it("lowercases and trims", () => {
    expect(normalizeHeader("  Year  ")).toBe("year");
  });

  it("converts spaces to underscores", () => {
    expect(normalizeHeader("Commodity Name")).toBe("commodity_name");
    expect(normalizeHeader("Unit of Measurement")).toBe("unit_of_measurement");
  });

  it("collapses multiple spaces/underscores", () => {
    expect(normalizeHeader("unit  of  measurement")).toBe("unit_of_measurement");
  });

  it("handles hyphens", () => {
    expect(normalizeHeader("product-name")).toBe("product_name");
  });

  it("handles null/undefined safely", () => {
    expect(normalizeHeader(null)).toBe("");
    expect(normalizeHeader(undefined)).toBe("");
  });
});

// ---------------------------------------------------------------------------
// validateRow
// ---------------------------------------------------------------------------

describe("validateRow", () => {
  const validRow = {
    year: 2023,
    zone: "South West",
    state: "Lagos",
    category: "Cereals",
    commodity_name: "Maize",
    unit_of_measurement: "KG",
    january: 100,
  };

  it("passes a fully valid row", () => {
    expect(validateRow(validRow)).toEqual([]);
  });

  it("reports missing required fields", () => {
    const errs = validateRow({ year: 2023, zone: "SW", state: "Lagos" });
    expect(errs).toContain("Missing category");
    expect(errs).toContain("Missing commodity_name");
    expect(errs).toContain("Missing unit_of_measurement");
  });

  it("reports invalid year", () => {
    const errs = validateRow({ ...validRow, year: 1800 });
    expect(errs).toContain("Invalid year");
  });

  it("reports invalid month value", () => {
    const errs = validateRow({ ...validRow, january: "abc" });
    expect(errs).toContain("Invalid january");
  });
});

// ---------------------------------------------------------------------------
// 1. Legacy headers (standard format)
// ---------------------------------------------------------------------------

describe("Legacy headers (standard format)", () => {
  const headers = [
    "Year", "Zone", "State", "Category", "Commodity Name",
    "Unit of Measurement", "January", "February", "Total", "Average",
  ];
  const rows = makeRows(headers, [
    [2023, "South West", "Lagos", "Cereals", "Maize", "KG", 100, 120, 220, 110],
    [2023, "North East", "Kano", "Vegetables", "Tomato", "Tonnes", 50, 60, 110, 55],
  ]);

  it("imports both rows successfully", () => {
    const { validRecords, errors } = processRawRowsForTesting(rows);
    expect(errors).toHaveLength(0);
    expect(validRecords).toHaveLength(2);
  });

  it("maps commodity_name correctly", () => {
    const { validRecords } = processRawRowsForTesting(rows);
    expect(validRecords[0].commodity_name).toBe("Maize");
  });

  it("maps unit_of_measurement correctly", () => {
    const { validRecords } = processRawRowsForTesting(rows);
    expect(validRecords[0].unit_of_measurement).toBe("KG");
  });

  it("coerces numeric months", () => {
    const { validRecords } = processRawRowsForTesting(rows);
    expect(validRecords[0].january).toBe(100);
    expect(validRecords[0].february).toBe(120);
  });

  it("produces no warnings for complete legacy files", () => {
    const { warnings } = processRawRowsForTesting(rows);
    expect(warnings).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 2. Alternate headers (description + unit, no category)
// ---------------------------------------------------------------------------

describe("Alternate headers (description / unit schema)", () => {
  const headers = ["year", "zone", "state", "s_no", "description", "unit", "january", "february"];
  const rows = makeRows(headers, [
    [2022, "South South", "Delta", 1, "Cassava", "Tonnes", 200, 180],
    [2022, "North West", "Sokoto", 2, "Groundnut", "KG", 90, 85],
  ]);

  it("maps description → commodity_name", () => {
    const { validRecords } = processRawRowsForTesting(rows);
    expect(validRecords[0].commodity_name).toBe("Cassava");
    expect(validRecords[1].commodity_name).toBe("Groundnut");
  });

  it("maps unit → unit_of_measurement", () => {
    const { validRecords } = processRawRowsForTesting(rows);
    expect(validRecords[0].unit_of_measurement).toBe("Tonnes");
  });

  it("records description→commodity_name in mappingsApplied", () => {
    const { summary } = processRawRowsForTesting(rows);
    expect(summary.mappingsApplied).toContain("description → commodity_name");
  });

  it("records unit→unit_of_measurement in mappingsApplied", () => {
    const { summary } = processRawRowsForTesting(rows);
    expect(summary.mappingsApplied).toContain("unit → unit_of_measurement");
  });

  it("all rows are valid (no hard errors)", () => {
    const { errors } = processRawRowsForTesting(rows);
    expect(errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 3. Description-only files (commodity_name absent, description present)
// ---------------------------------------------------------------------------

describe("Description-only files", () => {
  it("uses description when commodity_name column is absent", () => {
    const rows = makeRows(
      ["year", "zone", "state", "category", "description", "unit"],
      [[2021, "South East", "Enugu", "Cereals", "Sorghum", "KG"]]
    );
    const { validRecords } = processRawRowsForTesting(rows);
    expect(validRecords[0].commodity_name).toBe("Sorghum");
  });

  it("does not create a duplicate from description when commodity_name is also present", () => {
    const rows = makeRows(
      ["year", "zone", "state", "category", "commodity_name", "description", "unit"],
      [[2021, "South East", "Enugu", "Cereals", "Maize", "Old Desc", "KG"]]
    );
    const { validRecords } = processRawRowsForTesting(rows);
    // commodity_name takes precedence (appears first in COLUMN_MAP aliases)
    expect(validRecords[0].commodity_name).toBe("Maize");
  });
});

// ---------------------------------------------------------------------------
// 4. Missing category — commodity lookup
// ---------------------------------------------------------------------------

describe("Missing category — commodity lookup", () => {
  const rowsWithKnownCommodities = makeRows(
    ["year", "zone", "state", "description", "unit"],
    [
      [2023, "South West", "Ogun", "Rice", "KG"],
      [2023, "North East", "Borno", "Tomato", "Tonnes"],
    ]
  );

  it("infers category from COMMODITY_CATEGORY_MAP", () => {
    const { validRecords } = processRawRowsForTesting(rowsWithKnownCommodities);
    expect(validRecords[0].category).toBe("Cereals");   // rice
    expect(validRecords[1].category).toBe("Vegetables"); // tomato
  });

  it("emits a warning (not an error) for inferred categories", () => {
    const { errors, warnings } = processRawRowsForTesting(rowsWithKnownCommodities);
    expect(errors).toHaveLength(0);
    expect(warnings.length).toBeGreaterThan(0);
  });

  it("warning message mentions category and commodity name", () => {
    const { warnings } = processRawRowsForTesting(rowsWithKnownCommodities);
    expect(warnings[0]).toMatch(/category missing/i);
  });
});

// ---------------------------------------------------------------------------
// 5. Missing category — unknown commodity → Uncategorized
// ---------------------------------------------------------------------------

describe("Missing category — unknown commodity", () => {
  const rows = makeRows(
    ["year", "zone", "state", "description", "unit"],
    [[2023, "South West", "Lagos", "WidgetX9000", "pcs"]]
  );

  it("defaults category to Uncategorized", () => {
    const { validRecords } = processRawRowsForTesting(rows);
    expect(validRecords[0].category).toBe("Uncategorized");
  });

  it("emits a warning for defaulted category", () => {
    const { warnings } = processRawRowsForTesting(rows);
    expect(warnings[0]).toMatch(/Uncategorized/);
  });

  it("does NOT add row to errors", () => {
    const { errors } = processRawRowsForTesting(rows);
    expect(errors).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 6. Mixed schema (both legacy and alternate headers in same batch)
// ---------------------------------------------------------------------------

describe("Mixed schema (legacy + alternate in same batch)", () => {
  const legacyRow = {
    "Year": 2022, "Zone": "South West", "State": "Lagos",
    "Category": "Cereals", "Commodity Name": "Wheat",
    "Unit of Measurement": "KG", "January": 100,
  };
  const alternateRow = {
    "year": 2022, "zone": "North East", "state": "Kano",
    "description": "Millet", "unit": "Tonnes", "january": 80,
  };

  it("imports both rows successfully", () => {
    const { validRecords, errors } = processRawRowsForTesting([legacyRow, alternateRow]);
    expect(errors).toHaveLength(0);
    expect(validRecords).toHaveLength(2);
  });

  it("resolves commodity_name correctly for both schemas", () => {
    const { validRecords } = processRawRowsForTesting([legacyRow, alternateRow]);
    expect(validRecords[0].commodity_name).toBe("Wheat");
    expect(validRecords[1].commodity_name).toBe("Millet");
  });
});

// ---------------------------------------------------------------------------
// 7. XLSX round-trip (in-memory workbook)
// ---------------------------------------------------------------------------

describe("XLSX round-trip", () => {
  const headers = ["Year", "Zone", "State", "Category", "Commodity Name", "Unit of Measurement", "January"];
  const data = [
    [2023, "South West", "Oyo", "Cereals", "Maize", "KG", 500],
    [2023, "South East", "Imo", "Roots & Tubers", "Yam", "Tonnes", 300],
  ];

  it("correctly parses rows from an XLSX workbook", () => {
    const rawRows = xlsxRoundTrip(headers, data);
    const { validRecords, errors } = processRawRowsForTesting(rawRows);
    expect(errors).toHaveLength(0);
    expect(validRecords).toHaveLength(2);
    expect(validRecords[0].commodity_name).toBe("Maize");
    expect(validRecords[1].commodity_name).toBe("Yam");
  });

  it("coerces numeric values correctly from XLSX", () => {
    const rawRows = xlsxRoundTrip(headers, data);
    const { validRecords } = processRawRowsForTesting(rawRows);
    expect(validRecords[0].year).toBe(2023);
    expect(validRecords[0].january).toBe(500);
  });

  it("works with alternate headers in XLSX", () => {
    const altHeaders = ["year", "zone", "state", "description", "unit", "january"];
    const altData = [[2022, "North West", "Kano", "Groundnut", "Tonnes", 120]];
    const rawRows = xlsxRoundTrip(altHeaders, altData);
    const { validRecords, errors } = processRawRowsForTesting(rawRows);
    expect(errors).toHaveLength(0);
    expect(validRecords[0].commodity_name).toBe("Groundnut");
    expect(validRecords[0].unit_of_measurement).toBe("Tonnes");
  });
});

// ---------------------------------------------------------------------------
// 8. Import summary reporting
// ---------------------------------------------------------------------------

describe("Import summary reporting", () => {
  const rows = [
    // Valid legacy row
    { "Year": 2023, "Zone": "SW", "State": "Lagos", "Category": "Cereals", "Commodity Name": "Maize", "Unit of Measurement": "KG" },
    // Valid alternate row (will use description + commodity lookup for category)
    { "year": 2023, "zone": "NE", "state": "Kano", "description": "Rice", "unit": "Tonnes" },
    // Invalid row (missing zone, state, commodity_name, unit_of_measurement)
    { "Year": 1800 },
  ];

  it("reports correct totalRows", () => {
    const { summary } = processRawRowsForTesting(rows);
    expect(summary.totalRows).toBe(3);
  });

  it("reports correct imported count", () => {
    const { summary } = processRawRowsForTesting(rows);
    expect(summary.imported).toBe(2);
  });

  it("reports correct skipped count", () => {
    const { summary } = processRawRowsForTesting(rows);
    expect(summary.skipped).toBe(1);
  });

  it("reports warnings count > 0 for category inference", () => {
    const { summary } = processRawRowsForTesting(rows);
    expect(summary.warnings).toBeGreaterThan(0);
  });

  it("reports mappingsApplied for alternate headers", () => {
    const { summary } = processRawRowsForTesting(rows);
    expect(summary.mappingsApplied).toContain("description → commodity_name");
    expect(summary.mappingsApplied).toContain("unit → unit_of_measurement");
  });
});

// ---------------------------------------------------------------------------
// 9. Alias coverage — product_name, commodity_category, measurement_unit
// ---------------------------------------------------------------------------

describe("Additional alias coverage", () => {
  it("maps product_name → commodity_name", () => {
    const rows = makeRows(
      ["year", "zone", "state", "category", "product_name", "unit_of_measurement"],
      [[2023, "SW", "Lagos", "Cereals", "Barley", "KG"]]
    );
    const { validRecords } = processRawRowsForTesting(rows);
    expect(validRecords[0].commodity_name).toBe("Barley");
  });

  it("maps commodity_category → category", () => {
    const rows = makeRows(
      ["year", "zone", "state", "commodity_category", "commodity_name", "unit_of_measurement"],
      [[2023, "SW", "Lagos", "Oilseeds", "Sesame", "KG"]]
    );
    const { validRecords } = processRawRowsForTesting(rows);
    expect(validRecords[0].category).toBe("Oilseeds");
  });

  it("maps measurement_unit → unit_of_measurement", () => {
    const rows = makeRows(
      ["year", "zone", "state", "category", "commodity_name", "measurement_unit"],
      [[2023, "SW", "Lagos", "Cereals", "Wheat", "Bags"]]
    );
    const { validRecords } = processRawRowsForTesting(rows);
    expect(validRecords[0].unit_of_measurement).toBe("Bags");
  });

  it("maps product_category → category", () => {
    const rows = makeRows(
      ["year", "zone", "state", "product_category", "commodity_name", "unit_of_measurement"],
      [[2023, "SW", "Lagos", "Fruits", "Mango", "Crates"]]
    );
    const { validRecords } = processRawRowsForTesting(rows);
    expect(validRecords[0].category).toBe("Fruits");
  });
});

// ---------------------------------------------------------------------------
// 10. COMMODITY_CATEGORY_MAP spot-checks
// ---------------------------------------------------------------------------

describe("COMMODITY_CATEGORY_MAP contents", () => {
  it("contains expected Nigerian staples", () => {
    expect(COMMODITY_CATEGORY_MAP["rice"]).toBe("Cereals");
    expect(COMMODITY_CATEGORY_MAP["cassava"]).toBe("Roots & Tubers");
    expect(COMMODITY_CATEGORY_MAP["groundnut"]).toBe("Oilseeds");
    expect(COMMODITY_CATEGORY_MAP["tomato"]).toBe("Vegetables");
    expect(COMMODITY_CATEGORY_MAP["cocoa"]).toBe("Cash Crops");
    expect(COMMODITY_CATEGORY_MAP["catfish"]).toBe("Fishery");
  });
});
