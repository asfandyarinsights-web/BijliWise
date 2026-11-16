import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Card, { CardHeader } from "../ui/Card";
import ChartTooltip from "../charts/ChartTooltip";
import StatTile from "./StatTile";
import { useChartColors } from "../../hooks/useChartColors";
import { compactNumber } from "../../utils/analytics";
import { fmtPKR } from "../../utils/format";

export default function ExpenseAnalysis({ rows, summary }) {
  const colors = useChartColors();
  const axis = { fill: colors.axis, fontSize: 12 };
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
                  <CartesianGrid stroke={colors.grid} vertical={false} />
                  <XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={16} />
                  <YAxis tick={axis} axisLine={false} tickLine={false} tickFormatter={compactNumber} />
                  <Tooltip content={<ChartTooltip format={fmtPKR} />} cursor={{ stroke: colors.brand, strokeOpacity: 0.3 }} />
                  <Line type="monotone" dataKey="expense" stroke={colors.brand} strokeWidth={2.5}
                    dot={{ r: 4, fill: colors.brand, stroke: colors.brand }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <h4 className="mb-2 text-sm font-semibold">Monthly expenses</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows} margin={{ top: 5, right: 12, left: -4, bottom: 0 }}>
                  <CartesianGrid stroke={colors.grid} vertical={false} />
                  <XAxis dataKey="label" tick={axis} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={16} />
                  <YAxis tick={axis} axisLine={false} tickLine={false} tickFormatter={compactNumber} />
                  <Tooltip content={<ChartTooltip format={fmtPKR} />} cursor={{ fill: colors.cursor }} />
                  <Bar dataKey="expense" fill={colors.brand} radius={[6, 6, 0, 0]} maxBarSize={34} />
                  {showAverage && <ReferenceLine y={summary.avgExpense} stroke={colors.average} strokeDasharray="4 4" />}
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