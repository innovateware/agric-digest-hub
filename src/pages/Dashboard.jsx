import { useMemo } from 'react';
import { useStatisticalData } from '@/lib/useStatisticalData';
import StatCard from '@/components/dashboard/StatCard';
import DashboardCharts from '@/components/dashboard/DashboardCharts';
import { Database, MapPin, Wheat, Globe, TrendingUp, Calendar } from 'lucide-react';

export default function Dashboard() {
  const { data, isLoading } = useStatisticalData();

  const stats = useMemo(() => {
    if (!data?.length) return {};
    const states = new Set(data.map(r => r.state));
    const commodities = new Set(data.map(r => r.commodity_name));
    const zones = new Set(data.map(r => r.zone));
    const avgPrice = data.reduce((s, r) => s + (r.average || 0), 0) / data.length;
    const years = [...new Set(data.map(r => r.year))].sort((a, b) => b - a);
    return {
      totalRecords: data.length,
      totalStates: states.size,
      totalCommodities: commodities.size,
      totalZones: zones.size,
      avgPrice: avgPrice.toLocaleString(undefined, { maximumFractionDigits: 2 }),
      latestYear: years[0] || 'N/A'
    };
  }, [data]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading">Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-1">Overview of agricultural commodity statistics</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard title="Total Records" value={stats.totalRecords || 0} icon={Database} color="primary" />
        <StatCard title="States" value={stats.totalStates || 0} icon={MapPin} color="accent" />
        <StatCard title="Commodities" value={stats.totalCommodities || 0} icon={Wheat} color="chart3" />
        <StatCard title="Zones" value={stats.totalZones || 0} icon={Globe} color="chart4" />
        <StatCard title="Avg. Price" value={stats.avgPrice || '0'} icon={TrendingUp} color="chart5" />
        <StatCard title="Latest Year" value={stats.latestYear} icon={Calendar} color="primary" />
      </div>

      <DashboardCharts data={data} />
    </div>
  );
}