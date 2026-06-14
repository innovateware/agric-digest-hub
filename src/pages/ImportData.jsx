import { useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
// @ts-ignore
import { MONTHS } from "@/lib/useStatisticalData";
import { parseSpreadsheetFile } from "@/lib/parseSpreadsheet";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Upload, FileDown, CheckCircle2, AlertTriangle, FileSpreadsheet, Info, ArrowRight } from "lucide-react";
import { toast } from "sonner";

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
  const [errors, setErrors] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [validRecords, setValidRecords] = useState([]);
  const [summary, setSummary] = useState(null);
  const [progress, setProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [parsing, setParsing] = useState(false);

  const processFile = async (f) => {
    setFile(f);
    setParsing(true);
    try {
      const result = await parseSpreadsheetFile(f);
      const { validRecords: valid, errors: errs, warnings: warns, summary: sum } = result;

      setValidRecords(valid);
      setErrors(errs);
      setWarnings(warns);
      setSummary(sum);
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

  const downloadWarnings = () => {
    const lines = ["Warning"];
    warnings.forEach((w) => lines.push(`"${w.replace(/"/g, '""')}"`));
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "import_warnings.csv";
    a.click();
  };

  const reset = () => {
    setStep("upload");
    setFile(null);
    setErrors([]);
    setWarnings([]);
    setValidRecords([]);
    setSummary(null);
    setProgress(0);
  };

  const totalRows = summary?.totalRows ?? 0;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading">Import Statistical Data</h1>
          <p className="text-sm text-muted-foreground mt-1">Upload Excel or CSV files to import records</p>
        </div>
        <
          // @ts-ignore
          Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2">
          <FileDown className="w-4 h-4" /> Download Template
        </Button>
      </div>

      {step === "upload" && (
        <
          // @ts-ignore
          Card
          className={`border-2 border-dashed transition-colors ${dragActive ? "border-primary bg-primary/5" : "border-border"}`}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
        >
          <
            // @ts-ignore
            CardContent className="flex flex-col items-center justify-center py-16">
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
              <
                // @ts-ignore
                Button asChild disabled={parsing}>
                <span className="gap-2 cursor-pointer"><Upload className="w-4 h-4" /> Browse Files</span>
              </Button>
            </label>
          </CardContent>
        </Card>
      )}

      {step === "preview" && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-4">
            <
              // @ts-ignore
              Card className="p-4 text-center">
              <p className="text-3xl font-bold">{totalRows}</p>
              <p className="text-xs text-muted-foreground mt-1">Total Rows</p>
            </Card>
            <
              // @ts-ignore
              Card className="p-4 text-center">
              <p className="text-3xl font-bold text-accent">{validRecords.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Valid Records</p>
            </Card>
            <
              // @ts-ignore
              Card className="p-4 text-center">
              <p className="text-3xl font-bold text-destructive">{errors.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Invalid Records</p>
            </Card>
            <
              // @ts-ignore
              Card className="p-4 text-center">
              <p className="text-3xl font-bold text-yellow-500">{warnings.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Warnings</p>
            </Card>
          </div>

          {/* Mappings applied banner */}
          {summary?.mappingsApplied?.length > 0 && (
            <
              // @ts-ignore
              Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30">
              <
                // @ts-ignore
                CardContent className="py-3 px-4">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Schema mappings applied</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {summary.mappingsApplied.map((m, i) => (
                        <span key={i} className="inline-flex items-center gap-1 text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
                          {m.split(" → ")[0]}
                          <ArrowRight className="w-3 h-3" />
                          {m.split(" → ")[1]}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Warnings panel */}
          {warnings.length > 0 && (
            <
              // @ts-ignore
              Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/30">
              <
                // @ts-ignore
                CardHeader className="flex flex-row items-center justify-between py-3">
                <
                  // @ts-ignore
                  CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  <span className="text-yellow-700 dark:text-yellow-300">Warnings ({warnings.length})</span>
                </CardTitle>
                <
                  // @ts-ignore
                  Button variant="outline" size="sm" onClick={downloadWarnings} className="gap-1">
                  <FileDown className="w-3.5 h-3.5" /> Download
                </Button>
              </CardHeader>
              <
                // @ts-ignore
                CardContent className="p-0">
                <div className="max-h-36 overflow-y-auto">
                  <ul className="text-xs text-yellow-700 dark:text-yellow-300 divide-y divide-yellow-200 dark:divide-yellow-900">
                    {warnings.slice(0, 30).map((w, i) => (
                      <li key={i} className="px-4 py-1.5">{w}</li>
                    ))}
                    {warnings.length > 30 && (
                      <li className="px-4 py-1.5 text-muted-foreground">…and {warnings.length - 30} more</li>
                    )}
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Validation errors panel */}
          {errors.length > 0 && (
            <
              // @ts-ignore
              Card>
              <
                // @ts-ignore
                CardHeader className="flex flex-row items-center justify-between py-3">
                <
                  // @ts-ignore
                  CardTitle className="text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive" /> Validation Errors
                </CardTitle>
                <
                  // @ts-ignore
                  Button variant="outline" size="sm" onClick={downloadErrors} className="gap-1">
                  <FileDown className="w-3.5 h-3.5" /> Error Report
                </Button>
              </CardHeader>
              <
                // @ts-ignore
                CardContent className="p-0">
                <div className="max-h-48 overflow-y-auto">
                  <
                    // @ts-ignore
                    Table>
                    <
                      // @ts-ignore
                      TableHeader>
                      <
                        // @ts-ignore
                        TableRow><TableHead className="text-xs">Row</TableHead><TableHead className="text-xs">Errors</TableHead></TableRow>
                    </TableHeader>
                    <
                      // @ts-ignore
                      TableBody>
                      {errors.slice(0, 20).map((e, i) => (
                        <
                          // @ts-ignore
                          TableRow key={i}>
                          <
                            // @ts-ignore
                            TableCell className="text-sm">{e.row}</TableCell>
                          <
                            // @ts-ignore
                            TableCell className="text-sm text-destructive">{e.errors.join(", ")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Preview table */}
          {validRecords.length > 0 && (
            <
              // @ts-ignore
              Card>
              <
                // @ts-ignore
                CardHeader className="py-3">
                <
                  // @ts-ignore
                  CardTitle className="text-sm">Preview (first 5 valid records)</CardTitle>
              </CardHeader>
              <
                // @ts-ignore
                CardContent className="p-0 overflow-x-auto">
                <
                  // @ts-ignore
                  Table>
                  <
                    // @ts-ignore
                    TableHeader>
                    <
                      // @ts-ignore
                      TableRow>
                      <
                        // @ts-ignore
                        TableHead className="text-xs">Year</TableHead>
                      <
                        // @ts-ignore
                        TableHead className="text-xs">Zone</TableHead>
                      <
                        // @ts-ignore
                        TableHead className="text-xs">State</TableHead>
                      <
                        // @ts-ignore
                        TableHead className="text-xs">Category</TableHead>
                      <
                        // @ts-ignore
                        TableHead className="text-xs">Commodity</TableHead>
                      <
                        // @ts-ignore
                        TableHead className="text-xs">Unit</TableHead>
                      <
                        // @ts-ignore
                        TableHead className="text-xs">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <
                    // @ts-ignore
                    TableBody>
                    {validRecords.slice(0, 5).map((r, i) => (
                      <
                        // @ts-ignore
                        TableRow key={i}>
                        <
                          // @ts-ignore
                          TableCell className="text-sm">{r.year}</TableCell>
                        <
                          // @ts-ignore
                          TableCell className="text-sm">{r.zone}</TableCell>
                        <
                          // @ts-ignore
                          TableCell className="text-sm">{r.state}</TableCell>
                        <
                          // @ts-ignore
                          TableCell className="text-sm">{r.category}</TableCell>
                        <
                          // @ts-ignore
                          TableCell className="text-sm">{r.commodity_name}</TableCell>
                        <
                          // @ts-ignore
                          TableCell className="text-sm">{r.unit_of_measurement}</TableCell>
                        <
                          // @ts-ignore
                          TableCell className="text-sm">{r.total}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-3">
            <
              // @ts-ignore
              Button variant="outline" onClick={reset}>Cancel</Button>
            <
              // @ts-ignore
              Button onClick={handleImport} disabled={validRecords.length === 0} className="gap-2">
              <CheckCircle2 className="w-4 h-4" /> Import {validRecords.length} Records
            </Button>
          </div>
        </div>
      )}

      {step === "importing" && (
        <
          // @ts-ignore
          Card className="p-8 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-xl bg-primary/10 flex items-center justify-center">
            <Upload className="w-6 h-6 text-primary animate-pulse" />
          </div>
          <p className="font-semibold">Importing records...</p>
          <Progress
            // @ts-ignore
            value={progress} className="max-w-xs mx-auto" />
          <p className="text-sm text-muted-foreground">{progress}% complete</p>
        </Card>
      )}

      {step === "done" && (
        <
          // @ts-ignore
          Card className="p-8 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-xl bg-accent/10 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-accent" />
          </div>
          <p className="font-semibold text-lg">Import Complete!</p>

          {/* Final summary */}
          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-lg mx-auto text-left">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xl font-bold">{summary.totalRows}</p>
                <p className="text-xs text-muted-foreground">Total Rows</p>
              </div>
              <div className="rounded-lg bg-accent/10 p-3">
                <p className="text-xl font-bold text-accent">{summary.imported}</p>
                <p className="text-xs text-muted-foreground">Imported</p>
              </div>
              <div className="rounded-lg bg-destructive/10 p-3">
                <p className="text-xl font-bold text-destructive">{summary.skipped}</p>
                <p className="text-xs text-muted-foreground">Skipped</p>
              </div>
              <div className="rounded-lg bg-yellow-500/10 p-3">
                <p className="text-xl font-bold text-yellow-500">{summary.warnings}</p>
                <p className="text-xs text-muted-foreground">Warnings</p>
              </div>
            </div>
          )}

          {summary?.mappingsApplied?.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Schema mappings applied: {summary.mappingsApplied.join(", ")}
            </p>
          )}

          <
            // @ts-ignore
            Button onClick={reset}>Import More Data</Button>
        </Card>
      )}
    </div>
  );
}
