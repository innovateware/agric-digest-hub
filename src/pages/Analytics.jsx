import { useState, useMemo } from 'react';
import { useStatisticalData, MONTHS, MONTH_LABELS } from '@/lib/useStatisticalData';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ComposedChart
} from 'recharts';
import StatCard from '@/components/dashboard/StatCard';
import { TrendingUp, TrendingDown, Activity, Target } from 'lucide-react';

const COLORS = ['hsl(221, 83%, 28%)', 'hsl(152, 60%, 40%)', 'hsl(38, 92%, 50%)', 'hsl(280, 65%, 60%)', 'hsl(0, 72%, 51%)'];

export default function Analytics() {
  const { data, isLoading } = useStatisticalData();
  const [selectedYear, setSelectedYear] = useState('_all');
  const [selectedCategory, setSelectedCategory] = useState('_all');
  const [chartType, setChartType] = useState('line');

  const years = useMemo(() => [...new Set((data || []).map(r => r.year))].sort((a, b) => b - a), [data]);
  const categories = useMemo(() => [...new Set((data || []).map(r => r.category).filter(Boolean))].sort(), [data]);

  const filteredData = useMemo(() => {
    let d = data || [];
    if (selectedYear !== '_all') d = d.filter(r => String(r.year) === selectedYear);
    if (selectedCategory !== '_all') d = d.filter(r => r.category === selectedCategory);
    return d;
  }, [data, selectedYear, selectedCategory]);

  // Monthly trend data
  const monthlyTrend = useMemo(() => {
    return MONTHS.map((m, i) => {
      const total = filteredData.reduce((sum, r) => sum + (r[m] || 0), 0);
      const avg = filteredData.length ? total / filteredData.length : 0;
      return {
        month: MONTH_LABELS[i],
        total: Math.round(total),
        average: Math.round(avg * 100) / 100,
        recordCount: filteredData.length
      };
    });
  }, [filteredData]);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const map = {};
    filteredData.forEach(r => {
      if (!map[r.category]) map[r.category] = { name: r.category, total: 0, count: 0, avg: 0 };
      map[r.category].total += r.total || 0;
      map[r.category].count++;
    });
    return Object.values(map).map(c => ({
      ...c,
      avg: c.count ? Math.round(c.total / c.count) : 0
    })).sort((a, b) => b.total - a.total);
  }, [filteredData]);

  // Commodity trends (top 5)
  const commodityTrends = useMemo(() => {
    const map = {};
    filteredData.forEach(r => {
      if (!map[r.commodity_name]) map[r.commodity_name] = { name: r.commodity_name, total: 0, category: r.category };
      map[r.commodity_name].total += r.total || 0;
    });
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 5);
  }, [filteredData]);

  // State performance
  const statePerformance = useMemo(() => {
    const map = {};
    filteredData.forEach(r => {
      if (!map[r.state]) map[r.state] = { state: r.state, total: 0, avg: 0, count: 0 };
      map[r.state].total += r.total || 0;
      map[r.state].count++;
    });
    return Object.values(map).map(s => ({
      ...s,
      avg: s.count ? Math.round(s.total / s.count) : 0
    })).sort((a, b) => b.total - a.total).slice(0, 10);
  }, [filteredData]);

  // Year-over-year growth
  const yoyGrowth = useMemo(() => {
    const yearlyTotals = {};
    (data || []).forEach(r => {
      if (!yearlyTotals[r.year]) yearlyTotals[r.year] = 0;
      yearlyTotals[r.year] += r.total || 0;
    });
    
    const years = Object.keys(yearlyTotals).sort((a, b) => a - b);
    return years.map((year, i) => {
      const prevYear = years[i - 1];
      const prevTotal = prevYear ? yearlyTotals[prevYear] : 0;
      const currentTotal = yearlyTotals[year];
      const growth = prevTotal ? ((currentTotal - prevTotal) / prevTotal) * 100 : 0;
      return {
        year: Number(year),
        total: currentTotal,
        growth: Math.round(growth * 100) / 100
      };
    });
  }, [data]);

  // Analytics summary
  const summary = useMemo(() => {
    if (!filteredData.length) return {};
    const totalProduction = filteredData.reduce((s, r) => s + (r.total || 0), 0);
    const avgPrice = filteredData.reduce((s, r) => s + (r.average || 0), 0) / filteredData.length;
    const topCommodity = commodityTrends[0];
    const topCategory = categoryBreakdown[0];
    const growthRate = yoyGrowth.length ? yoyGrowth[yoyGrowth.length - 1].growth : 0;
    
    return {
      totalProduction: Math.round(totalProduction).toLocaleString(),
      avgPrice: Math.round(avgPrice * 100) / 100,
      topCommodity: topCommodity?.name || 'N/A',
      topCategory: topCategory?.name || 'N/A',
      growthRate
    };
  }, [filteredData, commodityTrends, categoryBreakdown, yoyGrowth]);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold font-heading">Analytics Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Commodity production trends and insights</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-32 h-9"><SelectValue placeholder="Year" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All Years</SelectItem>
              {years.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-32 h-9"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="_all">All Categories</SelectItem>
              {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Production" value={summary.totalProduction || '0'} icon={Activity} color="primary" />
        <StatCard title="Avg. Price" value={summary.avgPrice || '0'} icon={TrendingUp} color="accent" />
        <StatCard title="Top Commodity" value={summary.topCommodity} icon={Target} color="chart3" />
        <StatCard title="Growth Rate" value={`${summary.growthRate >= 0 ? '+' : ''}${summary.growthRate}%`} icon={summary.growthRate >= 0 ? TrendingUp : TrendingDown} color={summary.growthRate >= 0 ? 'accent' : 'destructive'} />
      </div>

      <Tabs defaultValue="monthly">
        <TabsList>
          <TabsTrigger value="monthly">Monthly Trends</TabsTrigger>
          <TabsTrigger value="category">Category Breakdown</TabsTrigger>
          <TabsTrigger value="commodity">Top Commodities</TabsTrigger>
          <TabsTrigger value="state">State Performance</TabsTrigger>
          <TabsTrigger value="growth">YoY Growth</TabsTrigger>
        </TabsList>

        <TabsContent value="monthly" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold">Monthly Production Trends</CardTitle>
              <Select value={chartType} onValueChange={setChartType}>
                <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="line">Line</SelectItem>
                  <SelectItem value="area">Area</SelectItem>
                  <SelectItem value="bar">Bar</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer>
                {chartType === 'line' ? (
                  <LineChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="total" stroke={COLORS[0]} strokeWidth={2} dot={{ r: 3 }} name="Total" />
                    <Line type="monotone" dataKey="average" stroke={COLORS[1]} strokeWidth={2} dot={{ r: 3 }} name="Average" />
                  </LineChart>
                ) : chartType === 'area' ? (
                  <AreaChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Area type="monotone" dataKey="total" stroke={COLORS[0]} fill={COLORS[0]} fillOpacity={0.3} name="Total" />
                    <Area type="monotone" dataKey="average" stroke={COLORS[1]} fill={COLORS[1]} fillOpacity={0.3} name="Average" />
                  </AreaChart>
                ) : (
                  <BarChart data={monthlyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="total" fill={COLORS[0]} radius={[4,4,0,0]} name="Total" />
                    <Bar dataKey="average" fill={COLORS[1]} radius={[4,4,0,0]} name="Average" />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="category" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-sm">Category Distribution</CardTitle></CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={categoryBreakdown} dataKey="total" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>
                      {categoryBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Category Totals</CardTitle></CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer>
                  <BarChart data={categoryBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="total" fill={COLORS[0]} radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="commodity" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Top 5 Commodities by Production</CardTitle></CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer>
                <BarChart data={commodityTrends} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip />
                  <Bar dataKey="total" fill={COLORS[0]} radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="state" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Top 10 States by Production</CardTitle></CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer>
                <BarChart data={statePerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="state" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="total" fill={COLORS[0]} radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="growth" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-sm">Year-over-Year Growth Analysis</CardTitle></CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer>
                <ComposedChart data={yoyGrowth}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar yAxisId="left" dataKey="total" fill={COLORS[0]} radius={[4,4,0,0]} name="Total Production" />
                  <Line yAxisId="right" type="monotone" dataKey="growth" stroke={COLORS[1]} strokeWidth={2} dot={{ r: 4 }} name="Growth Rate %" />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}