import { useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';

export default function DataFilters({ data = [], filters, setFilters }) {
  const options = useMemo(() => {
    const years = [...new Set(data.map(r => r.year))].sort((a, b) => b - a);
    const zones = [...new Set(data.map(r => r.zone).filter(Boolean))].sort();
    const states = [...new Set(data.map(r => r.state).filter(Boolean))].sort();
    const categories = [...new Set(data.map(r => r.category).filter(Boolean))].sort();
    const commodities = [...new Set(data.map(r => r.commodity_name).filter(Boolean))].sort();
    const units = [...new Set(data.map(r => r.unit_of_measurement).filter(Boolean))].sort();
    return { years, zones, states, categories, commodities, units };
  }, [data]);

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value === '_all' ? '' : value }));
  };

  const clearFilters = () => {
    setFilters({ search: '', year: '', zone: '', state: '', category: '', commodity: '', unit: '' });
  };

  const hasFilters = Object.values(filters).some(v => v);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search records..."
            value={filters.search}
            onChange={e => updateFilter('search', e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 text-xs gap-1">
            <X className="w-3 h-3" /> Clear
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <FilterSelect label="Year" value={filters.year} options={options.years.map(String)} onChange={v => updateFilter('year', v)} />
        <FilterSelect label="Zone" value={filters.zone} options={options.zones} onChange={v => updateFilter('zone', v)} />
        <FilterSelect label="State" value={filters.state} options={options.states} onChange={v => updateFilter('state', v)} />
        <FilterSelect label="Category" value={filters.category} options={options.categories} onChange={v => updateFilter('category', v)} />
        <FilterSelect label="Commodity" value={filters.commodity} options={options.commodities} onChange={v => updateFilter('commodity', v)} />
        <FilterSelect label="Unit" value={filters.unit} options={options.units} onChange={v => updateFilter('unit', v)} />
      </div>
    </div>
  );
}

function FilterSelect({ label, value, options, onChange }) {
  return (
    <Select value={value || '_all'} onValueChange={onChange}>
      <SelectTrigger className="w-36 h-8 text-xs">
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="_all">All {label}s</SelectItem>
        {options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}