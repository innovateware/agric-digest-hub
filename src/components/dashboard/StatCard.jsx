import { Card } from '@/components/ui/card';

export default function StatCard({ title, value, icon: Icon, trend, color = 'primary' }) {
  const colorMap = {
    primary: 'bg-primary/10 text-primary',
    accent: 'bg-accent/10 text-accent',
    destructive: 'bg-destructive/10 text-destructive',
    chart3: 'bg-[hsl(var(--chart-3))]/10 text-[hsl(var(--chart-3))]',
    chart4: 'bg-[hsl(var(--chart-4))]/10 text-[hsl(var(--chart-4))]',
    chart5: 'bg-[hsl(var(--chart-5))]/10 text-[hsl(var(--chart-5))]',
  };

  return (
    <Card className="p-5 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold font-heading">{value}</p>
          {trend && <p className="text-xs text-accent font-medium">{trend}</p>}
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-lg ${colorMap[color]}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </Card>
  );
}