import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Card, { CardHeader } from "../ui/Card";
import ChartTooltip from "./ChartTooltip";
import { useChartColors } from "../../hooks/useChartColors";
import { fmtPKR } from "../../utils/format";

export default function ExpenseChart({ data = [] }) {
  const colors = useChartColors();
  const axis = { fill: colors.axis, fontSize: 12 };
  return (
    <Card>
      <CardHeader title="Monthly expenses" subtitle="Electricity bill per month (PKR), all saved bills combined" />
      <div className="h-72 p-3 pt-5">
        {data.length === 0 ? (
          <div className="grid h-full place-items-center text-sm text-muted">No expense data yet.</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 12, left: -4, bottom: 0 }}>
              <CartesianGrid stroke={colors.grid} vertical={false} />
              <XAxis dataKey="short" tick={axis} axisLine={false} tickLine={false} />
              <YAxis tick={axis} axisLine={false} tickLine={false}
                tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)} />
              <Tooltip content={<ChartTooltip format={fmtPKR} />} cursor={{ fill: colors.cursor }} />
              <Bar dataKey="bill" fill={colors.brand} radius={[6, 6, 0, 0]} maxBarSize={34} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}