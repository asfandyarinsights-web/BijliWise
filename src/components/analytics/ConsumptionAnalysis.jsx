import { Area, AreaChart, Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Card, { CardHeader } from "../ui/Card";
import ChartTooltip from "../charts/ChartTooltip";
import StatTile from "./StatTile";
import { useChartColors } from "../../hooks/useChartColors";
import { compactNumber } from "../../utils/analytics";
import { fmtKwh } from "../../utils/format";

export default function ConsumptionAnalysis({ rows, summary }) {
  const colors = useChartColors();
  const axis = { fill: colors.axis, fontSize: 12 };
  const showAverage = rows.length >= 2;

  return (
    <Card>
      <CardHeader title="Electricity consumption" subtitle="Recorded kWh per month, from saved bills" />
      <div className="space-y-5 p-5">
        <dl className="grid gap-3 sm:grid-cols-3">
          <StatTile label="Average per month" value={fmtKwh(summary.avgKwh)} />
          <StatTile label="Highest month" value={summary.highestKwh.label} hint={fmtKwh(summary.highestKwh.kwh)} />
          <StatTile label="Lowest month" value={summary.lowestKwh.label} hint={fmtKwh(summary.lowestKwh.kwh)} />
        </dl>

        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <h4 className="mb-2 text-sm font-semibold">Monthly trend</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={rows} margin={{ top: 5, right: 12, left: -12, bottom: 0 }}>
                  <defs>
                    <linearGradient id="kwhTrendFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={colors.brand} stopOpacity={0.4} />
                      <stop offset="100%" stopColor={colors.brand} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={colors.grid} vertical={false} />
                  <XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={16} />
                  <YAxis tick={axis} axisLine={false} tickLine={false} tickFormatter={compactNumber} />
                  <Tooltip content={<ChartTooltip format={fmtKwh} />} cursor={{ stroke: colors.brand, strokeOpacity: 0.3 }} />
                  <Area type="monotone" dataKey="kwh" stroke={colors.brand} strokeWidth={2.5} fill="url(#kwhTrendFill)"
                    dot={{ r: 4, fill: colors.brand, stroke: colors.brand }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <h4 className="mb-2 text-sm font-semibold">Month-by-month comparison</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows} margin={{ top: 5, right: 12, left: -12, bottom: 0 }}>
                  <CartesianGrid stroke={colors.grid} vertical={false} />
                  <XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={16} />
                  <YAxis tick={axis} axisLine={false} tickLine={false} tickFormatter={compactNumber} />
                  <Tooltip content={<ChartTooltip format={fmtKwh} />} cursor={{ fill: colors.cursor }} />
                  <Bar dataKey="kwh" fill={colors.brand} radius={[6, 6, 0, 0]} maxBarSize={34} />
                  {showAverage && <ReferenceLine y={summary.avgKwh} stroke={colors.average} strokeDasharray="4 4" />}
                </BarChart>
              </ResponsiveContainer>
            </div>
            {showAverage && <p className="mt-1 text-xs text-muted">Dashed line: average of the months shown.</p>}
          </div>
        </div>
      </div>
    </Card>
  );
}