import { useState } from 'react';
import { useGetAnalyticsOverview } from '@workspace/api-client-react';
import {
  AreaChart, Area,
  BarChart, Bar,
  LineChart, Line,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { cn } from '@/lib/utils';
import { TrendingUp, FolderKanban, CheckCircle2, Users } from 'lucide-react';

// ── Palette ────────────────────────────────────────────────────────────────
const C = {
  revenue:    '#6366f1',
  created:    '#8b5cf6',
  completed:  '#10b981',
  rate:       '#06b6d4',
  clients:    '#f59e0b',
  grid:       'rgba(148,163,184,0.12)',
  text:       '#94a3b8',
};

const TASK_COLORS: Record<string, string> = {
  todo:        '#475569',
  in_progress: '#f59e0b',
  review:      '#3b82f6',
  done:        '#10b981',
};
const TASK_LABELS: Record<string, string> = {
  todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done',
};

const CAMPAIGN_COLORS = [
  '#6366f1','#8b5cf6','#ec4899','#f59e0b',
  '#10b981','#3b82f6','#ef4444','#94a3b8',
];
const CAMPAIGN_LABELS: Record<string, string> = {
  social_media:       'Social Media',
  branding:           'Branding',
  content_marketing:  'Content',
  advertising:        'Advertising',
  web_design:         'Web Design',
  pr:                 'PR',
  video_production:   'Video',
  other:              'Other',
};

// ── Shared chart tooltip ───────────────────────────────────────────────────
const ChartTooltip = ({
  active, payload, label, formatter,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
  formatter?: (v: number, name: string) => string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-xl text-xs">
      {label && <p className="mb-1.5 font-semibold text-foreground">{label}</p>}
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted-foreground capitalize">{p.name}:</span>
          <span className="font-medium text-foreground">
            {formatter ? formatter(p.value, p.name) : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

// ── Period tab ─────────────────────────────────────────────────────────────
type Period = 'monthly' | 'quarterly' | 'yearly';
const PERIODS: { value: Period; label: string }[] = [
  { value: 'monthly',   label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly',    label: 'Yearly' },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 6 }, (_, i) => currentYear - i);

// ── Card wrapper ───────────────────────────────────────────────────────────
function ChartCard({ title, subtitle, children, className }: {
  title: string; subtitle?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn('rounded-xl border border-border bg-card p-5 flex flex-col gap-4', className)}>
      <div>
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

// ── KPI card ───────────────────────────────────────────────────────────────
function KpiCard({ label, value, icon: Icon, color, sub }: {
  label: string; value: string; icon: React.ElementType; color: string; sub?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex items-start gap-4">
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
        style={{ background: `${color}22` }}
      >
        <Icon className="h-5 w-5" style={{ color }} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className="mt-1 text-2xl font-bold text-foreground tracking-tight">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-lg bg-muted', className)} />;
}

// ── Helpers ────────────────────────────────────────────────────────────────
const fmt$ = (n: number) =>
  n >= 1_000_000
    ? `$${(n / 1_000_000).toFixed(1)}M`
    : n >= 1_000
    ? `$${(n / 1_000).toFixed(1)}K`
    : `$${n.toLocaleString()}`;

// ── Main page ──────────────────────────────────────────────────────────────
export default function Analytics() {
  const [period, setPeriod] = useState<Period>('monthly');
  const [year, setYear] = useState(currentYear);

  const { data, isLoading } = useGetAnalyticsOverview(
    { period, year },
    { query: { queryKey: ['analyticsOverview', period, year] } },
  );

  const summary = data?.summary;
  const periodLabel =
    period === 'yearly' ? 'last 6 years' : String(year);

  return (
    <div className="flex flex-col min-h-full bg-background">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur px-6 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Analytics</h1>
            <p className="text-sm text-muted-foreground">
              Performance overview · {periodLabel}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Year selector — hidden in yearly mode */}
            {period !== 'yearly' && (
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="h-9 rounded-md border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            )}

            {/* Period tabs */}
            <div className="flex rounded-lg border border-border bg-card p-0.5 gap-0.5">
              {PERIODS.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPeriod(p.value)}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                    period === p.value
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 p-6 space-y-6">
        {/* ── KPI row ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))
          ) : (
            <>
              <KpiCard
                label="Total Revenue"
                value={fmt$(summary?.totalRevenue ?? 0)}
                icon={TrendingUp}
                color={C.revenue}
                sub={`${periodLabel}`}
              />
              <KpiCard
                label="Projects"
                value={String(summary?.totalProjects ?? 0)}
                icon={FolderKanban}
                color={C.created}
                sub="created in period"
              />
              <KpiCard
                label="Completion Rate"
                value={`${summary?.avgCompletionRate ?? 0}%`}
                icon={CheckCircle2}
                color={C.completed}
                sub="projects completed"
              />
              <KpiCard
                label="New Clients"
                value={String(summary?.totalClients ?? 0)}
                icon={Users}
                color={C.clients}
                sub={`${periodLabel}`}
              />
            </>
          )}
        </div>

        {/* ── Row 1: Revenue + Task Status ─────────────────────────── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Revenue over time */}
          <ChartCard
            title="Revenue"
            subtitle="Total contracted budget per period"
            className="lg:col-span-8"
          >
            {isLoading ? (
              <Skeleton className="h-64" />
            ) : (
              <ResponsiveContainer width="100%" height={256}>
                <AreaChart data={data?.revenueByPeriod ?? []} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={C.revenue} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={C.revenue} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={C.grid} vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: C.text, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: C.text, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => fmt$(v)} width={56} />
                  <Tooltip content={<ChartTooltip formatter={(v) => fmt$(v)} />} />
                  <Area
                    type="monotone" dataKey="revenue" name="Revenue"
                    stroke={C.revenue} strokeWidth={2}
                    fill="url(#revGrad)" dot={false} activeDot={{ r: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Task status donut */}
          <ChartCard
            title="Task Status"
            subtitle="All-time distribution"
            className="lg:col-span-4"
          >
            {isLoading ? (
              <Skeleton className="h-64" />
            ) : (data?.taskStatusBreakdown?.length ?? 0) === 0 ? (
              <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">No tasks yet</div>
            ) : (
              <div className="flex flex-col gap-3">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={data!.taskStatusBreakdown}
                      dataKey="count"
                      nameKey="status"
                      cx="50%" cy="50%"
                      innerRadius={52} outerRadius={80}
                      paddingAngle={2}
                    >
                      {data!.taskStatusBreakdown.map((entry) => (
                        <Cell
                          key={entry.status}
                          fill={TASK_COLORS[entry.status] ?? C.text}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const p = payload[0]!;
                        return (
                          <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-xl text-xs">
                            <span style={{ color: TASK_COLORS[p.name as string] ?? C.text }} className="font-semibold">
                              {TASK_LABELS[p.name as string] ?? p.name}
                            </span>
                            <span className="ml-2 text-foreground font-bold">{p.value}</span>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-1.5">
                  {data!.taskStatusBreakdown.map((e) => (
                    <div key={e.status} className="flex items-center gap-1.5 text-xs">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ background: TASK_COLORS[e.status] ?? C.text }} />
                      <span className="text-muted-foreground truncate">{TASK_LABELS[e.status] ?? e.status}</span>
                      <span className="ml-auto font-medium text-foreground">{e.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </ChartCard>
        </div>

        {/* ── Row 2: Projects + Campaign Types ─────────────────────── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Projects created vs completed */}
          <ChartCard title="Projects" subtitle="Created vs completed per period">
            {isLoading ? (
              <Skeleton className="h-56" />
            ) : (
              <ResponsiveContainer width="100%" height={224}>
                <BarChart data={data?.projectsByPeriod ?? []} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barCategoryGap="30%">
                  <CartesianGrid stroke={C.grid} vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: C.text, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: C.text, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend
                    wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                    formatter={(v) => <span style={{ color: C.text }}>{v}</span>}
                  />
                  <Bar dataKey="created" name="Created" fill={C.created} radius={[3, 3, 0, 0]} />
                  <Bar dataKey="completed" name="Completed" fill={C.completed} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Campaign types */}
          <ChartCard title="Campaign Types" subtitle="Project mix by category">
            {isLoading ? (
              <Skeleton className="h-56" />
            ) : (data?.campaignTypeBreakdown?.length ?? 0) === 0 ? (
              <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
                No campaign types set — edit a project to add one
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={224}>
                <BarChart
                  layout="vertical"
                  data={data!.campaignTypeBreakdown.map((d, i) => ({
                    ...d,
                    name: CAMPAIGN_LABELS[d.type] ?? d.type,
                    fill: CAMPAIGN_COLORS[i % CAMPAIGN_COLORS.length],
                  }))}
                  margin={{ top: 4, right: 24, bottom: 0, left: 0 }}
                  barCategoryGap="25%"
                >
                  <CartesianGrid stroke={C.grid} horizontal={false} />
                  <XAxis type="number" tick={{ fill: C.text, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis
                    type="category" dataKey="name"
                    tick={{ fill: C.text, fontSize: 11 }} axisLine={false} tickLine={false}
                    width={96}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="count" name="Projects" radius={[0, 3, 3, 0]}>
                    {data!.campaignTypeBreakdown.map((_, i) => (
                      <Cell key={i} fill={CAMPAIGN_COLORS[i % CAMPAIGN_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        {/* ── Row 3: Clients + Completion Rate ─────────────────────── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Clients growth */}
          <ChartCard
            title="New Clients"
            subtitle="Clients added per period"
            className="lg:col-span-5"
          >
            {isLoading ? (
              <Skeleton className="h-52" />
            ) : (
              <ResponsiveContainer width="100%" height={208}>
                <AreaChart data={data?.clientsByPeriod ?? []} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="clientGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={C.clients} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={C.clients} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={C.grid} vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: C.text, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: C.text, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area
                    type="monotone" dataKey="clients" name="Clients"
                    stroke={C.clients} strokeWidth={2}
                    fill="url(#clientGrad)" dot={false} activeDot={{ r: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Completion rate trend */}
          <ChartCard
            title="Completion Rate"
            subtitle="% of projects completed per period"
            className="lg:col-span-7"
          >
            {isLoading ? (
              <Skeleton className="h-52" />
            ) : (
              <ResponsiveContainer width="100%" height={208}>
                <LineChart data={data?.completionRateByPeriod ?? []} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke={C.grid} vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: C.text, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fill: C.text, fontSize: 11 }} axisLine={false} tickLine={false}
                    domain={[0, 100]} tickFormatter={(v) => `${v}%`} width={40}
                  />
                  <Tooltip content={<ChartTooltip formatter={(v) => `${v}%`} />} />
                  <Line
                    type="monotone" dataKey="rate" name="Rate"
                    stroke={C.rate} strokeWidth={2}
                    dot={{ fill: C.rate, strokeWidth: 0, r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>
      </div>
    </div>
  );
}
