import { useState, useMemo } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAuth } from "@/lib/AuthContext";
import { useStatisticalData, MONTHS, MONTH_LABELS, canEdit, canDelete } from "@/lib/useStatisticalData";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import DataFilters from "@/components/data/DataFilters";
import RecordFormDialog from "@/components/data/RecordFormDialog";
import { Plus, Trash2, Pencil, MoreHorizontal, ChevronLeft, ChevronRight, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

const PAGE_SIZE = 25;

export default function DataTable() {
  const { user } = useAuth();
  const { data: allData, isLoading } = useStatisticalData();
  const createRecord = useMutation(api.statisticalData.create);
  const updateRecord = useMutation(api.statisticalData.update);
  const removeRecord = useMutation(api.statisticalData.remove);
  const logExport = useMutation(api.statisticalData.logExport);

  const [filters, setFilters] = useState({ search: "", year: "", zone: "", state: "", category: "", commodity: "", unit: "" });
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState([]);
  const [sortCol, setSortCol] = useState("");
  const [sortDir, setSortDir] = useState("asc");
  const [formOpen, setFormOpen] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [saving, setSaving] = useState(false);

  const filteredData = useMemo(() => {
    let d = allData || [];
    if (filters.search) {
      const s = filters.search.toLowerCase();
      d = d.filter((r) => [r.commodity_name, r.state, r.zone, r.category].some((v) => v?.toLowerCase().includes(s)));
    }
    if (filters.year) d = d.filter((r) => String(r.year) === filters.year);
    if (filters.zone) d = d.filter((r) => r.zone === filters.zone);
    if (filters.state) d = d.filter((r) => r.state === filters.state);
    if (filters.category) d = d.filter((r) => r.category === filters.category);
    if (filters.commodity) d = d.filter((r) => r.commodity_name === filters.commodity);
    if (filters.unit) d = d.filter((r) => r.unit_of_measurement === filters.unit);

    if (sortCol) {
      d = [...d].sort((a, b) => {
        const av = a[sortCol] ?? "";
        const bv = b[sortCol] ?? "";
        const cmp = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv));
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return d;
  }, [allData, filters, sortCol, sortDir]);

  const totalPages = Math.ceil(filteredData.length / PAGE_SIZE);
  const pageData = filteredData.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const toggleSort = (col) => {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  const toggleSelect = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const toggleAll = () => {
    if (selected.length === pageData.length) setSelected([]);
    else setSelected(pageData.map((r) => r.id));
  };

  const handleSave = async (data) => {
    setSaving(true);
    try {
      if (editRecord) {
        await updateRecord({ id: editRecord.id, ...data });
        toast.success("Record updated");
      } else {
        await createRecord(data);
        toast.success("Record created");
      }
      setFormOpen(false);
      setEditRecord(null);
    } catch (err) {
      toast.error(err.message || "Failed to save record");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (ids) => {
    try {
      for (const id of ids) {
        await removeRecord({ id });
      }
      setSelected([]);
      toast.success(`${ids.length} record(s) deleted`);
    } catch (err) {
      toast.error(err.message || "Failed to delete records");
    }
  };

  const exportExcel = async () => {
    const headers = ["Year", "Zone", "State", "Category", "Commodity", "Unit", ...MONTH_LABELS, "Total", "Average"];
    const rows = filteredData.map((r) => [
      r.year, r.zone, r.state, r.category, r.commodity_name, r.unit_of_measurement,
      ...MONTHS.map((m) => r[m] ?? ""), r.total ?? "", r.average ?? "",
    ]);
    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `statistical_data_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    try {
      await logExport({ count: filteredData.length, format: "CSV" });
    } catch {
      // Export still succeeded locally
    }
    toast.success(`${filteredData.length} records exported`);
  };

  const SortableHead = ({ col, label }) => (
    <TableHead
      className="text-xs font-semibold cursor-pointer hover:bg-muted/50 whitespace-nowrap select-none"
      onClick={() => toggleSort(col)}
    >
      {label} {sortCol === col ? (sortDir === "asc" ? "↑" : "↓") : ""}
    </TableHead>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold font-heading">Data Table</h1>
          <p className="text-sm text-muted-foreground">{filteredData.length} records</p>
        </div>
        <div className="flex gap-2">
          {canDelete(user) && selected.length > 0 && (
            <Button variant="destructive" size="sm" onClick={() => handleDelete(selected)} className="gap-1">
              <Trash2 className="w-3.5 h-3.5" /> Delete ({selected.length})
            </Button>
          )}

          <Button variant="outline" size="sm" onClick={exportExcel} className="gap-1">
            <FileSpreadsheet className="w-3.5 h-3.5" /> Export
          </Button>
          {canEdit(user) && (
            <Button size="sm" onClick={() => { setEditRecord(null); setFormOpen(true); }} className="gap-1">
              <Plus className="w-3.5 h-3.5" /> Add Record
            </Button>
          )}
        </div>
      </div>

      <Card className="p-4">
        <DataFilters data={allData} filters={filters} setFilters={setFilters} />
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                {canDelete(user) && (
                  <TableHead className="w-10">
                    <Checkbox checked={selected.length === pageData.length && pageData.length > 0} onCheckedChange={toggleAll} />
                  </TableHead>
                )}
                <SortableHead col="year" label="Year" />
                <SortableHead col="zone" label="Zone" />
                <SortableHead col="state" label="State" />
                <SortableHead col="category" label="Category" />
                <SortableHead col="commodity_name" label="Commodity" />
                <SortableHead col="unit_of_measurement" label="Unit" />
                {MONTH_LABELS.map((m, i) => <SortableHead key={i} col={MONTHS[i]} label={m} />)}
                <SortableHead col="total" label="Total" />
                <SortableHead col="average" label="Avg" />
                {canEdit(user) && <TableHead className="w-10" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={22} className="text-center py-10 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : pageData.length === 0 ? (
                <TableRow><TableCell colSpan={22} className="text-center py-10 text-muted-foreground">No records found</TableCell></TableRow>
              ) : pageData.map((r) => (
                <TableRow key={r.id} className="hover:bg-muted/30">
                  {canDelete(user) && (
                    <TableCell><Checkbox checked={selected.includes(r.id)} onCheckedChange={() => toggleSelect(r.id)} /></TableCell>
                  )}
                  <TableCell className="text-sm font-medium">{r.year}</TableCell>
                  <TableCell className="text-sm">{r.zone}</TableCell>
                  <TableCell className="text-sm">{r.state}</TableCell>
                  <TableCell className="text-sm">{r.category}</TableCell>
                  <TableCell className="text-sm font-medium">{r.commodity_name}</TableCell>
                  <TableCell className="text-sm">{r.unit_of_measurement}</TableCell>
                  {MONTHS.map((m) => <TableCell key={m} className="text-sm text-right tabular-nums">{r[m]?.toLocaleString() ?? "-"}</TableCell>)}
                  <TableCell className="text-sm font-semibold text-right tabular-nums">{r.total?.toLocaleString() ?? "-"}</TableCell>
                  <TableCell className="text-sm font-semibold text-right tabular-nums">{r.average?.toLocaleString() ?? "-"}</TableCell>
                  {canEdit(user) && (
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="w-4 h-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditRecord(r); setFormOpen(true); }}>
                            <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
                          </DropdownMenuItem>
                          {canDelete(user) && (
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDelete([r.id])}>
                              <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <p className="text-xs text-muted-foreground">
              Page {page + 1} of {totalPages}
            </p>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" className="h-7 w-7" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              <Button variant="outline" size="icon" className="h-7 w-7" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      <RecordFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        record={editRecord}
        onSave={handleSave}
        loading={saving}
      />
    </div>
  );
}
