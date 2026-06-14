import { useState, useMemo } from 'react';
import { useStatisticalData } from '@/lib/useStatisticalData';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Download, TrendingUp, TrendingDown, Award, MapPin } from 'lucide-react';
import { toast } from 'sonner';

export default function Reports() {
  const { data, isLoading } = useStatisticalData();
  const [yearFilter, setYearFilter] = useState('_all');

  const years = useMemo(() => [...new Set((data || []).map(r => r.year))].sort((a, b) => b - a), [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    return yearFilter === '_all' ? data : data.filter(r => String(r.year) === yearFilter);
  }, [data, yearFilter]);

  const analytics = useMemo(() => {
    if (!filtered.length) return {};
    const maxRec = filtered.reduce((max, r) => (r.total || 0) > (max.total || 0) ? r : max, filtered[0]);
    const minRec = filtered.reduce((min, r) => (r.total || 0) < (min.total || 0) ? r : min, filtered[0]);

    const stateAvg = {};
    filtered.forEach(r => {
      if (!stateAvg[r.state]) stateAvg[r.state] = { sum: 0, count: 0 };
      stateAvg[r.state].sum += r.average || 0;
      stateAvg[r.state].count++;
    });
    const bestState = Object.entries(stateAvg).sort((a, b) => (b[1].sum / b[1].count) - (a[1].sum / a[1].count))[0];

    const commAvg = {};
    filtered.forEach(r => {
      if (!commAvg[r.commodity_name]) commAvg[r.commodity_name] = { sum: 0, count: 0 };
      commAvg[r.commodity_name].sum += r.average || 0;
      commAvg[r.commodity_name].count++;
    });
    const bestComm = Object.entries(commAvg).sort((a, b) => (b[1].sum / b[1].count) - (a[1].sum / a[1].count))[0];

    return {
      highest: { value: maxRec.total, commodity: maxRec.commodity_name, state: maxRec.state },
      lowest: { value: minRec.total, commodity: minRec.commodity_name, state: minRec.state },
      bestState: bestState ? bestState[0] : 'N/A',
      bestCommodity: bestComm ? bestComm[0] : 'N/A',
    };
  }, [filtered]);

  const stateReport = useMemo(() => {
    const map = {};
    filtered.forEach(r => {
      if (!map[r.state]) map[r.state] = { state: r.state, records: 0, total: 0, avg: 0 };
      map[r.state].records++;
      map[r.state].total += r.total || 0;
    });
    Object.values(map).forEach(s => s.avg = s.records ? Math.round(s.total / s.records * 100) / 100 : 0);
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [filtered]);

  const zoneReport = useMemo(() => {
    const map = {};
    filtered.forEach(r => {
      if (!map[r.zone]) map[r.zone] = { zone: r.zone, records: 0, total: 0, states: new Set() };
      map[r.zone].records++;
      map[r.zone].total += r.total || 0;
      map[r.zone].states.add(r.state);
    });
    return Object.values(map).map(z => ({ ...z, stateCount: z.states.size })).sort((a, b) => b.total - a.total);
  }, [filtered]);

  const commodityReport = useMemo(() => {
    const map = {};
    filtered.forEach(r => {
      if (!map[r.commodity_name]) map[r.commodity_name] = { name: r.commodity_name, category: r.category, records: 0, total: 0, avg: 0 };
      map[r.commodity_name].records++;
      map[r.commodity_name].total += r.total || 0;
    });
    Object.values(map).forEach(c => c.avg = c.records ? Math.round(c.total / c.records * 100) / 100 : 0);
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [filtered]);

  const annualReport = useMemo(() => {
    const map = {};
    (data || []).forEach(r => {
      if (!map[r.year]) map[r.year] = { year: r.year, records: 0, total: 0 };
      map[r.year].records++;
      map[r.year].total += r.total || 0;
    });
    return Object.values(map).sort((a, b) => a.year - b.year);
  }, [data]);

  const exportReport = (reportData, name) => {
    const keys = Object.keys(reportData[0] || {}).filter(k => k !== 'states');
    const csv = [keys.join(','), ...reportData.map(r => keys.map(k => r[k]).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${name}_report.csv`;
    a.click();
    toast.success('Report exported');
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold font-heading">Reports & Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">Comprehensive statistical analysis</p>
        </div>
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="w-36 h-9"><SelectValue placeholder="Filter Year" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All Years</SelectItem>
            {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2"><TrendingUp className="w-4 h-4 text-accent" /><span className="text-xs font-medium text-muted-foreground">Highest Value</span></div>
          <p className="text-lg font-bold">{analytics.highest?.value?.toLocaleString() ?? '-'}</p>
          <p className="text-xs text-muted-foreground">{analytics.highest?.commodity} — {analytics.highest?.state}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2"><TrendingDown className="w-4 h-4 text-destructive" /><span className="text-xs font-medium text-muted-foreground">Lowest Value</span></div>
          <p className="text-lg font-bold">{analytics.lowest?.value?.toLocaleString() ?? '-'}</p>
          <p className="text-xs text-muted-foreground">{analytics.lowest?.commodity} — {analytics.lowest?.state}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2"><MapPin className="w-4 h-4 text-primary" /><span className="text-xs font-medium text-muted-foreground">Best State</span></div>
          <p className="text-lg font-bold">{analytics.bestState}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2"><Award className="w-4 h-4 text-[hsl(var(--chart-3))]" /><span className="text-xs font-medium text-muted-foreground">Best Commodity</span></div>
          <p className="text-lg font-bold">{analytics.bestCommodity}</p>
        </Card>
      </div>

      <Tabs defaultValue="state">
        <TabsList>
          <TabsTrigger value="state">State</TabsTrigger>
          <TabsTrigger value="zone">Zone</TabsTrigger>
          <TabsTrigger value="commodity">Commodity</TabsTrigger>
          <TabsTrigger value="annual">Annual</TabsTrigger>
        </TabsList>

        <TabsContent value="state" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => exportReport(stateReport, 'state')} className="gap-1">
              <Download className="w-3.5 h-3.5" /> Export
            </Button>
          </div>
          <Card className="overflow-hidden">
            <Table>
              <TableHeader><TableRow className="bg-muted/30">
                <TableHead className="text-xs">State</TableHead>
                <TableHead className="text-xs text-right">Records</TableHead>
                <TableHead className="text-xs text-right">Total</TableHead>
                <TableHead className="text-xs text-right">Average</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {stateReport.map(r => (
                  <TableRow key={r.state}>
                    <TableCell className="text-sm font-medium">{r.state}</TableCell>
                    <TableCell className="text-sm text-right">{r.records}</TableCell>
                    <TableCell className="text-sm text-right tabular-nums">{r.total.toLocaleString()}</TableCell>
                    <TableCell className="text-sm text-right tabular-nums">{r.avg.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
          <Card className="p-4">
            <p className="text-sm font-semibold mb-3">State Totals</p>
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart data={stateReport.slice(0, 15)} margin={{ bottom: 50, left: 0, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="state" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="total" fill="hsl(221, 83%, 28%)" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="zone" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => exportReport(zoneReport.map(z => ({ zone: z.zone, records: z.records, total: z.total, states: z.stateCount })), 'zone')} className="gap-1">
              <Download className="w-3.5 h-3.5" /> Export
            </Button>
          </div>
          <Card className="overflow-hidden">
            <Table>
              <TableHeader><TableRow className="bg-muted/30">
                <TableHead className="text-xs">Zone</TableHead>
                <TableHead className="text-xs text-right">Records</TableHead>
                <TableHead className="text-xs text-right">States</TableHead>
                <TableHead className="text-xs text-right">Total</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {zoneReport.map(r => (
                  <TableRow key={r.zone}>
                    <TableCell className="text-sm font-medium">{r.zone}</TableCell>
                    <TableCell className="text-sm text-right">{r.records}</TableCell>
                    <TableCell className="text-sm text-right">{r.stateCount}</TableCell>
                    <TableCell className="text-sm text-right tabular-nums">{r.total.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="commodity" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => exportReport(commodityReport, 'commodity')} className="gap-1">
              <Download className="w-3.5 h-3.5" /> Export
            </Button>
          </div>
          <Card className="overflow-hidden">
            <Table>
              <TableHeader><TableRow className="bg-muted/30">
                <TableHead className="text-xs">Commodity</TableHead>
                <TableHead className="text-xs">Category</TableHead>
                <TableHead className="text-xs text-right">Records</TableHead>
                <TableHead className="text-xs text-right">Total</TableHead>
                <TableHead className="text-xs text-right">Average</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {commodityReport.slice(0, 30).map(r => (
                  <TableRow key={r.name}>
                    <TableCell className="text-sm font-medium">{r.name}</TableCell>
                    <TableCell className="text-sm">{r.category}</TableCell>
                    <TableCell className="text-sm text-right">{r.records}</TableCell>
                    <TableCell className="text-sm text-right tabular-nums">{r.total.toLocaleString()}</TableCell>
                    <TableCell className="text-sm text-right tabular-nums">{r.avg.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="annual" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => exportReport(annualReport, 'annual')} className="gap-1">
              <Download className="w-3.5 h-3.5" /> Export
            </Button>
          </div>
          <Card className="p-4">
            <p className="text-sm font-semibold mb-3">Year-over-Year Trend</p>
            <div className="h-72">
              <ResponsiveContainer>
                <LineChart data={annualReport} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="total" stroke="hsl(221, 83%, 28%)" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card className="overflow-hidden">
            <Table>
              <TableHeader><TableRow className="bg-muted/30">
                <TableHead className="text-xs">Year</TableHead>
                <TableHead className="text-xs text-right">Records</TableHead>
                <TableHead className="text-xs text-right">Total</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {annualReport.map(r => (
                  <TableRow key={r.year}>
                    <TableCell className="text-sm font-medium">{r.year}</TableCell>
                    <TableCell className="text-sm text-right">{r.records}</TableCell>
                    <TableCell className="text-sm text-right tabular-nums">{r.total.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}