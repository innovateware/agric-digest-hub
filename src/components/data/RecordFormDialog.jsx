import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { MONTHS } from '@/lib/useStatisticalData';

const FIELDS = ['year', 'zone', 'state', 'category', 'commodity_name', 'unit_of_measurement'];

export default function RecordFormDialog({ open, onOpenChange, record, onSave, loading }) {
  const [form, setForm] = useState({});

  useEffect(() => {
    if (record) {
      setForm({ ...record });
    } else {
      const empty = {};
      FIELDS.forEach(f => empty[f] = '');
      MONTHS.forEach(m => empty[m] = '');
      empty.total = '';
      empty.average = '';
      setForm(empty);
    }
  }, [record, open]);

  const handleChange = (key, value) => {
    const updated = { ...form, [key]: value };

    // Auto-calculate total & average for month fields
    if (MONTHS.includes(key)) {
      const total = MONTHS.reduce((s, m) => s + (parseFloat(updated[m]) || 0), 0);
      const filledMonths = MONTHS.filter(m => updated[m] !== '' && updated[m] !== undefined && updated[m] !== null).length;
      updated.total = Math.round(total * 100) / 100;
      updated.average = filledMonths > 0 ? Math.round((total / filledMonths) * 100) / 100 : 0;
    }
    setForm(updated);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...form };
    if (data.year) data.year = Number(data.year);
    MONTHS.forEach(m => { if (data[m] !== '' && data[m] !== undefined) data[m] = Number(data[m]); });
    if (data.total !== '' && data.total !== undefined) data.total = Number(data.total);
    if (data.average !== '' && data.average !== undefined) data.average = Number(data.average);
    onSave(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{record ? 'Edit Record' : 'Add New Record'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {FIELDS.map(f => (
              <div key={f} className="space-y-1.5">
                <Label className="text-xs capitalize">{f.replace(/_/g, ' ')}</Label>
                <Input
                  value={form[f] || ''}
                  onChange={e => handleChange(f, e.target.value)}
                  className="h-8 text-sm"
                  required={['year','zone','state','category','commodity_name','unit_of_measurement'].includes(f)}
                />
              </div>
            ))}
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Monthly Values</p>
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {MONTHS.map(m => (
                <div key={m} className="space-y-1">
                  <Label className="text-[11px] capitalize">{m.slice(0, 3)}</Label>
                  <Input
                    type="number"
                    step="any"
                    value={form[m] ?? ''}
                    onChange={e => handleChange(m, e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Total</Label>
              <Input value={form.total ?? ''} readOnly className="h-8 text-sm bg-muted" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Average</Label>
              <Input value={form.average ?? ''} readOnly className="h-8 text-sm bg-muted" />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}