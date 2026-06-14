import { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const COLORS = [
  'hsl(221, 83%, 28%)', 'hsl(152, 60%, 40%)', 'hsl(38, 92%, 50%)',
  'hsl(280, 65%, 60%)', 'hsl(0, 72%, 51%)', 'hsl(200, 70%, 50%)',
  'hsl(120, 50%, 45%)', 'hsl(300, 50%, 50%)'
];

const MONTHS = ['january','february','march','april','may','june','july','august','september','october','november','december'];

function ChartWrapper({ title, children, chartType, setChartType }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        <Select value={chartType} onValueChange={setChartType}>
          <SelectTrigger className="w-28 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="bar">Bar</SelectItem>
            <SelectItem value="line">Line</SelectItem>
            <SelectItem value="area">Area</SelectItem>
            <SelectItem value="pie">Pie</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="h-72">{children}</CardContent>
    </Card>
  );
}

function RenderChart({ type, data, dataKey, nameKey = 'name' }) {
  if (!data?.length) return <p className="text-sm text-muted-foreground text-center pt-10">No data available</p>;

  if (type === 'pie') {
    return (
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey={dataKey} nameKey={nameKey} cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  const ChartComp = type === 'line' ? LineChart : type === 'area' ? AreaChart : BarChart;
  const DataComp = type === 'line' ? Line : type === 'area' ? Area : Bar;

  return (
    <ResponsiveContainer>
      <ChartComp data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey={nameKey} tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <DataComp
          dataKey={dataKey}
          fill={COLORS[0]}
          stroke={COLORS[0]}
          fillOpacity={type === 'area' ? 0.3 : 1}
          type="monotone"
        />
      </ChartComp>
    </ResponsiveContainer>
  );
}

export default function DashboardCharts({ data = [] }) {
  const [monthlyType, setMonthlyType] = useState('bar');
  const [commodityType, setCommodityType] = useState('bar');
  const [stateType, setStateType] = useState('bar');
  const [zoneType, setZoneType] = useState('pie');

  const monthlyData = useMemo(() => {
    return MONTHS.map(m => ({
      name: m.charAt(0).toUpperCase() + m.slice(0, 3),
      value: data.reduce((sum, r) => sum + (r[m] || 0), 0)
    }));
  }, [data]);

  const commodityData = useMemo(() => {
    const map = {};
    data.forEach(r => {
      map[r.commodity_name] = (map[r.commodity_name] || 0) + (r.total || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([name, value]) => ({ name, value }));
  }, [data]);

  const stateData = useMemo(() => {
    const map = {};
    data.forEach(r => {
      map[r.state] = (map[r.state] || 0) + (r.average || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 10)
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }));
  }, [data]);

  const zoneData = useMemo(() => {
    const map = {};
    data.forEach(r => {
      map[r.zone] = (map[r.zone] || 0) + (r.total || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value: Math.round(value) }));
  }, [data]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <ChartWrapper title="Monthly Trend Analysis" chartType={monthlyType} setChartType={setMonthlyType}>
        <RenderChart type={monthlyType} data={monthlyData} dataKey="value" />
      </ChartWrapper>
      <ChartWrapper title="Top Commodities" chartType={commodityType} setChartType={setCommodityType}>
        <RenderChart type={commodityType} data={commodityData} dataKey="value" />
      </ChartWrapper>
      <ChartWrapper title="State Comparison" chartType={stateType} setChartType={setStateType}>
        <RenderChart type={stateType} data={stateData} dataKey="value" />
      </ChartWrapper>
      <ChartWrapper title="Zone Distribution" chartType={zoneType} setChartType={setZoneType}>
        <RenderChart type={zoneType} data={zoneData} dataKey="value" />
      </ChartWrapper>
    </div>
  );
}