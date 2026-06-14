import { useAuditLogs } from '@/lib/useStatisticalData';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ClipboardList } from 'lucide-react';

const ACTION_COLORS = {
  create: 'bg-accent/10 text-accent border-accent/20',
  update: 'bg-primary/10 text-primary border-primary/20',
  delete: 'bg-destructive/10 text-destructive border-destructive/20',
  import: 'bg-[hsl(var(--chart-3))]/10 text-[hsl(var(--chart-3))] border-[hsl(var(--chart-3))]/20',
  export: 'bg-[hsl(var(--chart-4))]/10 text-[hsl(var(--chart-4))] border-[hsl(var(--chart-4))]/20',
};

export default function AuditLog() {
  const { data: logs, isLoading } = useAuditLogs();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading">Audit Log</h1>
        <p className="text-sm text-muted-foreground mt-1">Track all system activities</p>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="text-xs">Date</TableHead>
              <TableHead className="text-xs">Action</TableHead>
              <TableHead className="text-xs">Details</TableHead>
              <TableHead className="text-xs">User</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-16">
                  <ClipboardList className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-muted-foreground">No activity logs yet</p>
                </TableCell>
              </TableRow>
            ) : logs.map(log => (
              <TableRow key={log.id}>
                <TableCell className="text-sm whitespace-nowrap">
                  {log.created_date ? format(new Date(log.created_date), 'MMM d, yyyy HH:mm') : '-'}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-[11px] ${ACTION_COLORS[log.action] || ''}`}>
                    {log.action}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm max-w-md truncate">{log.details}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{log.user_email || '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}