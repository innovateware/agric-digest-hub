import { useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { MONTHS } from "@/lib/useStatisticalData";
import { parseSpreadsheetFile } from "@/lib/parseSpreadsheet";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Upload, FileDown, CheckCircle2, AlertTriangle, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

const REQUIRED = ["year", "zone", "state", "category", "commodity_name", "unit_of_measurement"];
const TEMPLATE_COLS = [
  "Year", "Zone", "State", "Category", "Commodity Name", "Unit of Measurement",
  "January", "February", "March", "April", "May", "June", "July", "August",
  "September", "October", "November", "December", "Total", "Average",
];

export default function ImportData() {
  const bulkCreate = useMutation(api.statisticalData.bulkCreate);
  const logImport = useMutation(api.statisticalData.logImport);
  const [step, setStep] = useState("upload");
  const [file, setFile] = useState(null);
  const [records, setRecords] = useState([]);
  const [errors, setErrors] = useState([]);
  const [validRecords, setValidRecords] = useState([]);
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [parsing, setParsing] = useState(false);

  const processFile = async (f) => {
    setFile(f);
    setParsing(true);
    try {
      const parsed = await parseSpreadsheetFile(f);
      setRecords(parsed);

      const errs = [];
      const valid = [];
      parsed.forEach((r, i) => {
        const rowErrors = [];
        REQUIRED.forEach((field) => {
          if (!r[field] && r[field] !== 0) rowErrors.push(`Missing ${field}`);
        });
        if (r.year && (isNaN(r.year) || r.year < 1900 || r.year > 2100)) rowErrors.push("Invalid year");
        MONTHS.forEach((m) => {
          if (r[m] !== undefined && r[m] !== null && r[m] !== "" && isNaN(Number(r[m]))) {
            rowErrors.push(`Invalid ${m}`);
          }
        });

        if (rowErrors.length) errs.push({ row: i + 1, errors: rowErrors, data: r });
        else valid.push(r);
      });

      setErrors(errs);
      setValidRecords(valid);
      setStep("preview");
    } catch (err) {
      toast.error("Failed to parse file: " + (err.message || "Unknown error"));
    } finally {
      setParsing(false);
    }
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0]);
  }, []);

  const handleImport = async () => {
    setStep("importing");
    const batchSize = 20;
    let imported = 0;

    try {
      for (let i = 0; i < validRecords.length; i += batchSize) {
        const batch = validRecords.slice(i, i + batchSize);
        await bulkCreate({ records: batch });
        imported += batch.length;
        setProgress(Math.round((imported / validRecords.length) * 100));
      }

      await logImport({ count: imported, filename: file?.name ?? "unknown" });
      setStep("done");
      toast.success(`${imported} records imported successfully`);
    } catch (err) {
      toast.error(err.message || "Import failed");
      setStep("preview");
    }
  };

  const downloadTemplate = () => {
    const csv = TEMPLATE_COLS.join(",") + "\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "statistical_digest_template.csv";
    a.click();
    toast.success("Template downloaded");
  };

  const downloadErrors = () => {
    const lines = ["Row,Errors,Data"];
    errors.forEach((e) => {
      lines.push(`${e.row},"${e.errors.join("; ")}","${JSON.stringify(e.data).replace(/"/g, '""')}"`);
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "import_errors.csv";
    a.click();
  };

  const reset = () => {
    setStep("upload");
    setFile(null);
    setRecords([]);
    setErrors([]);
    setValidRecords([]);
    setProgress(0);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading">Import Statistical Data</h1>
          <p className="text-sm text-muted-foreground mt-1">Upload Excel or CSV files to import records</p>
        </div>
        <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2">
          <FileDown className="w-4 h-4" /> Download Template
        </Button>
      </div>

      {step === "upload" && (
        <Card
          className={`border-2 border-dashed transition-colors ${dragActive ? "border-primary bg-primary/5" : "border-border"}`}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
        >
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <FileSpreadsheet className="w-8 h-8 text-primary" />
            </div>
            <p className="text-lg font-semibold mb-1">{parsing ? "Parsing file..." : "Drop your file here"}</p>
            <p className="text-sm text-muted-foreground mb-4">Supports XLSX, XLS, and CSV formats</p>
            <label>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                disabled={parsing}
                onChange={(e) => e.target.files?.[0] && processFile(e.target.files[0])}
              />
              <Button asChild disabled={parsing}>
                <span className="gap-2 cursor-pointer"><Upload className="w-4 h-4" /> Browse Files</span>
              </Button>
            </label>
          </CardContent>
        </Card>
      )}

      {step === "preview" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Card className="p-4 text-center">
              <p className="text-3xl font-bold">{records.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Total Records</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-3xl font-bold text-accent">{validRecords.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Valid Records</p>
            </Card>
            <Card className="p-4 text-center">
              <p className="text-3xl font-bold text-destructive">{errors.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Invalid Records</p>
            </Card>
          </div>

          {errors.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between py-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive" /> Validation Errors
                </CardTitle>
                <Button variant="outline" size="sm" onClick={downloadErrors} className="gap-1">
                  <FileDown className="w-3.5 h-3.5" /> Error Report
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-48 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow><TableHead className="text-xs">Row</TableHead><TableHead className="text-xs">Errors</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                      {errors.slice(0, 20).map((e, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-sm">{e.row}</TableCell>
                          <TableCell className="text-sm text-destructive">{e.errors.join(", ")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {validRecords.length > 0 && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Preview (first 5 valid records)</CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Year</TableHead>
                      <TableHead className="text-xs">Zone</TableHead>
                      <TableHead className="text-xs">State</TableHead>
                      <TableHead className="text-xs">Category</TableHead>
                      <TableHead className="text-xs">Commodity</TableHead>
                      <TableHead className="text-xs">Unit</TableHead>
                      <TableHead className="text-xs">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {validRecords.slice(0, 5).map((r, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-sm">{r.year}</TableCell>
                        <TableCell className="text-sm">{r.zone}</TableCell>
                        <TableCell className="text-sm">{r.state}</TableCell>
                        <TableCell className="text-sm">{r.category}</TableCell>
                        <TableCell className="text-sm">{r.commodity_name}</TableCell>
                        <TableCell className="text-sm">{r.unit_of_measurement}</TableCell>
                        <TableCell className="text-sm">{r.total}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={reset}>Cancel</Button>
            <Button onClick={handleImport} disabled={validRecords.length === 0} className="gap-2">
              <CheckCircle2 className="w-4 h-4" /> Import {validRecords.length} Records
            </Button>
          </div>
        </div>
      )}

      {step === "importing" && (
        <Card className="p-8 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-xl bg-primary/10 flex items-center justify-center">
            <Upload className="w-6 h-6 text-primary animate-pulse" />
          </div>
          <p className="font-semibold">Importing records...</p>
          <Progress value={progress} className="max-w-xs mx-auto" />
          <p className="text-sm text-muted-foreground">{progress}% complete</p>
        </Card>
      )}

      {step === "done" && (
        <Card className="p-8 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-xl bg-accent/10 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-accent" />
          </div>
          <p className="font-semibold text-lg">Import Complete!</p>
          <p className="text-sm text-muted-foreground">{validRecords.length} records imported successfully</p>
          <Button onClick={reset}>Import More Data</Button>
        </Card>
      )}
    </div>
  );
}
