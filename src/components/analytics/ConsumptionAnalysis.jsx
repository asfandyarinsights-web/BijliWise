import { Area, AreaChart, Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Card, { CardHeader } from "../ui/Card";
import ChartTooltip from "../charts/ChartTooltip";
import StatTile from "./StatTile";
import { compactNumber } from "../../utils/analytics";
import { fmtKwh } from "../../utils/format";

const AXIS = { fill: "#94a3b8", fontSize: 12 };

export default function ConsumptionAnalysis({ rows, summary }) {
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
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgb(148 163 184 / 0.12)" vertical={false} />
                  <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={16} />
                  <YAxis tick={AXIS} axisLine={false} tickLine={false} tickFormatter={compactNumber} />
                  <Tooltip content={<ChartTooltip format={fmtKwh} />} cursor={{ stroke: "#10b981", strokeOpacity: 0.3 }} />
                  <Area type="monotone" dataKey="kwh" stroke="#10b981" strokeWidth={2.5} fill="url(#kwhTrendFill)"
                    dot={{ r: 4, fill: "#10b981", stroke: "#10b981" }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <h4 className="mb-2 text-sm font-semibold">Month-by-month comparison</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows} margin={{ top: 5, right: 12, left: -12, bottom: 0 }}>
                  <CartesianGrid stroke="rgb(148 163 184 / 0.12)" vertical={false} />
                  <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={16} />
                  <YAxis tick={AXIS} axisLine={false} tickLine={false} tickFormatter={compactNumber} />
                  <Tooltip content={<ChartTooltip format={fmtKwh} />} cursor={{ fill: "rgb(148 163 184 / 0.08)" }} />
                  <Bar dataKey="kwh" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={34} />
                  {showAverage && <ReferenceLine y={summary.avgKwh} stroke="#94a3b8" strokeDasharray="4 4" />}
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