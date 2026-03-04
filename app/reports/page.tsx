'use client';

import { useState } from 'react';
import { DashboardShell } from '@/components/layout';
import { ChatWidget } from '@/components/modules/chat';
import { ReportCard, ReportResultDialog } from '@/components/modules/reports';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  BarChart3,
  Clock,
  ShoppingCart,
  Users,
  Package,
  CreditCard,
  CalendarDays,
  LayoutDashboard,
} from 'lucide-react';
import { format, subDays, subMonths, startOfMonth, startOfQuarter, startOfYear } from 'date-fns';
import { cn } from '@/lib/utils';
import type { ReportResult } from '@/lib/services/report.service';

const MASTER_REPORT = {
  type: 'master_report' as const,
  title: 'Master Report',
  description: 'Complete business overview combining all reports into one comprehensive document — sales, invoices, purchases, revenue, products, and accounts receivable.',
  icon: LayoutDashboard,
};

const REPORTS = [
  {
    type: 'sales_summary' as const,
    title: 'Sales Summary',
    description: 'Total revenue, order count by status, and top customers.',
    icon: BarChart3,
  },
  {
    type: 'invoice_aging' as const,
    title: 'Invoice Aging',
    description: 'Overdue invoices broken down into 30/60/90+ day buckets.',
    icon: Clock,
  },
  {
    type: 'purchase_overview' as const,
    title: 'Purchase Overview',
    description: 'Spending by status with top vendors breakdown.',
    icon: ShoppingCart,
  },
  {
    type: 'revenue_by_customer' as const,
    title: 'Revenue by Customer',
    description: 'Revenue per customer from confirmed sales, sorted descending.',
    icon: Users,
  },
  {
    type: 'product_performance' as const,
    title: 'Product Performance',
    description: 'Top products by quantity sold and revenue.',
    icon: Package,
  },
  {
    type: 'accounts_receivable' as const,
    title: 'Accounts Receivable',
    description: 'Outstanding balance per customer from unpaid invoices.',
    icon: CreditCard,
  },
];

type DatePreset =
  | 'last_30_days'
  | 'last_3_months'
  | 'last_6_months'
  | 'last_12_months'
  | 'this_month'
  | 'this_quarter'
  | 'this_year'
  | 'all_time'
  | 'custom';

const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: 'last_30_days', label: 'Last 30 Days' },
  { value: 'last_3_months', label: 'Last 3 Months' },
  { value: 'last_6_months', label: 'Last 6 Months' },
  { value: 'last_12_months', label: 'Last 12 Months' },
  { value: 'this_month', label: 'This Month' },
  { value: 'this_quarter', label: 'This Quarter' },
  { value: 'this_year', label: 'This Year' },
  { value: 'all_time', label: 'All Time' },
  { value: 'custom', label: 'Custom Range' },
];

function resolveDatePreset(preset: DatePreset): { dateFrom: string; dateTo: string } | null {
  const now = new Date();
  const dateTo = format(now, 'yyyy-MM-dd');

  switch (preset) {
    case 'last_30_days':
      return { dateFrom: format(subDays(now, 30), 'yyyy-MM-dd'), dateTo };
    case 'last_3_months':
      return { dateFrom: format(subMonths(now, 3), 'yyyy-MM-dd'), dateTo };
    case 'last_6_months':
      return { dateFrom: format(subMonths(now, 6), 'yyyy-MM-dd'), dateTo };
    case 'last_12_months':
      return { dateFrom: format(subMonths(now, 12), 'yyyy-MM-dd'), dateTo };
    case 'this_month':
      return { dateFrom: format(startOfMonth(now), 'yyyy-MM-dd'), dateTo };
    case 'this_quarter':
      return { dateFrom: format(startOfQuarter(now), 'yyyy-MM-dd'), dateTo };
    case 'this_year':
      return { dateFrom: format(startOfYear(now), 'yyyy-MM-dd'), dateTo };
    case 'all_time':
      return null;
    case 'custom':
      return null; // handled separately
  }
}

export default function ReportsPage() {
  const { user, logout } = useAuth();
  const [loadingReport, setLoadingReport] = useState<string | null>(null);
  const [reportResult, setReportResult] = useState<ReportResult | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [datePreset, setDatePreset] = useState<DatePreset>('last_30_days');
  const [customFrom, setCustomFrom] = useState<Date | undefined>(undefined);
  const [customTo, setCustomTo] = useState<Date | undefined>(undefined);

  const getDateRange = () => {
    if (datePreset === 'custom') {
      if (customFrom && customTo) {
        return {
          dateFrom: format(customFrom, 'yyyy-MM-dd'),
          dateTo: format(customTo, 'yyyy-MM-dd'),
        };
      }
      return null;
    }
    return resolveDatePreset(datePreset);
  };

  const handleGenerate = async (reportType: string) => {
    if (datePreset === 'custom' && (!customFrom || !customTo)) {
      toast.error('Please select both a start and end date for custom range.');
      return;
    }
    setLoadingReport(reportType);
    try {
      const dateRange = getDateRange();
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportType,
          ...(dateRange ? { dateFrom: dateRange.dateFrom, dateTo: dateRange.dateTo } : {}),
        }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error || 'Failed to generate report');
        return;
      }
      setReportResult(data.data);
      setDialogOpen(true);
    } catch (error) {
      toast.error('Failed to generate report');
      console.error(error);
    } finally {
      setLoadingReport(null);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      toast.success('Signed out');
    } catch {
      toast.error('Failed to sign out');
    }
  };

  const handlePresetChange = (v: string) => {
    setDatePreset(v as DatePreset);
    if (v !== 'custom') {
      setCustomFrom(undefined);
      setCustomTo(undefined);
    }
  };

  return (
    <DashboardShell
      user={user ? { name: user.name || user.username || 'User', email: user.username || '' } : undefined}
      onSignOut={handleSignOut}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <BarChart3 className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Reports</h1>
              <p className="text-muted-foreground">Generate on-demand business reports from Odoo ERP data.</p>
            </div>
          </div>

          {/* Date Range Selector */}
          <div className="flex items-center gap-2 flex-wrap">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            <Select value={datePreset} onValueChange={handlePresetChange}>
              <SelectTrigger className="w-[170px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_PRESETS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {datePreset === 'custom' && (
              <>
                <DatePicker
                  date={customFrom}
                  onSelect={setCustomFrom}
                  placeholder="Start date"
                  toDate={customTo}
                />
                <span className="text-muted-foreground text-sm">to</span>
                <DatePicker
                  date={customTo}
                  onSelect={setCustomTo}
                  placeholder="End date"
                  fromDate={customFrom}
                />
              </>
            )}
          </div>
        </div>

        {/* Report Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {REPORTS.map((report) => (
            <ReportCard
              key={report.type}
              title={report.title}
              description={report.description}
              icon={report.icon}
              isLoading={loadingReport === report.type}
              onGenerate={() => handleGenerate(report.type)}
            />
          ))}
        </div>

        {/* Master Report — full-width card */}
        <Card className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <MASTER_REPORT.icon className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold">{MASTER_REPORT.title}</h3>
            <p className="text-sm text-muted-foreground">{MASTER_REPORT.description}</p>
          </div>
          <Button
            onClick={() => handleGenerate(MASTER_REPORT.type)}
            disabled={loadingReport === MASTER_REPORT.type}
            className="shrink-0 w-full sm:w-auto"
          >
            {loadingReport === MASTER_REPORT.type ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate All Reports'
            )}
          </Button>
        </Card>

        {/* Bottom padding for chat widget */}
        <div className="h-20" />
      </div>

      <ReportResultDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        report={reportResult}
      />

      <ChatWidget />
    </DashboardShell>
  );
}

function DatePicker({
  date,
  onSelect,
  placeholder,
  fromDate,
  toDate,
}: {
  date: Date | undefined;
  onSelect: (d: Date | undefined) => void;
  placeholder: string;
  fromDate?: Date;
  toDate?: Date;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn('w-[130px] justify-start text-left font-normal', !date && 'text-muted-foreground')}
        >
          <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
          {date ? format(date, 'MMM d, yyyy') : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => {
            onSelect(d);
            setOpen(false);
          }}
          fromDate={fromDate}
          toDate={toDate || new Date()}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
