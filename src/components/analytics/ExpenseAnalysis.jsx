import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Card, { CardHeader } from "../ui/Card";
import ChartTooltip from "../charts/ChartTooltip";
import StatTile from "./StatTile";
import { compactNumber } from "../../utils/analytics";
import { fmtPKR } from "../../utils/format";

const AXIS = { fill: "#94a3b8", fontSize: 12 };

export default function ExpenseAnalysis({ rows, summary }) {
  const showAverage = rows.length >= 2;

  return (
    <Card>
      <CardHeader title="Electricity expenses" subtitle="Recorded bill amounts per month (PKR). Amounts are taken from your bills, not estimated." />
      <div className="space-y-5 p-5">
        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Total for this period" value={fmtPKR(summary.totalExpense)} />
          <StatTile label="Average per month" value={fmtPKR(summary.avgExpense)} />
          <StatTile label="Highest spending month" value={summary.highestExpense.label} hint={fmtPKR(summary.highestExpense.expense)} />
          <StatTile label="Lowest spending month" value={summary.lowestExpense.label} hint={fmtPKR(summary.lowestExpense.expense)} />
        </dl>

        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <h4 className="mb-2 text-sm font-semibold">Expense trend</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={rows} margin={{ top: 5, right: 12, left: -4, bottom: 0 }}>
                  <CartesianGrid stroke="rgb(148 163 184 / 0.12)" vertical={false} />
                  <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={16} />
                  <YAxis tick={AXIS} axisLine={false} tickLine={false} tickFormatter={compactNumber} />
                  <Tooltip content={<ChartTooltip format={fmtPKR} />} cursor={{ stroke: "#10b981", strokeOpacity: 0.3 }} />
                  <Line type="monotone" dataKey="expense" stroke="#10b981" strokeWidth={2.5}
                    dot={{ r: 4, fill: "#10b981", stroke: "#10b981" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <h4 className="mb-2 text-sm font-semibold">Monthly expenses</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows} margin={{ top: 5, right: 12, left: -4, bottom: 0 }}>
                  <CartesianGrid stroke="rgb(148 163 184 / 0.12)" vertical={false} />
                  <XAxis dataKey="label" tick={AXIS} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={16} />
                  <YAxis tick={AXIS} axisLine={false} tickLine={false} tickFormatter={compactNumber} />
                  <Tooltip content={<ChartTooltip format={fmtPKR} />} cursor={{ fill: "rgb(148 163 184 / 0.08)" }} />
                  <Bar dataKey="expense" fill="#10b981" radius={[6, 6, 0, 0]} maxBarSize={34} />
                  {showAverage && <ReferenceLine y={summary.avgExpense} stroke="#94a3b8" strokeDasharray="4 4" />}
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