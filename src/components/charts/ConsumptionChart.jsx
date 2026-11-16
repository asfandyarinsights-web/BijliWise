import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Card, { CardHeader } from "../ui/Card";
import ChartTooltip from "./ChartTooltip";
import { useChartColors } from "../../hooks/useChartColors";
import { fmtKwh } from "../../utils/format";

export default function ConsumptionChart({ data = [] }) {
  const colors = useChartColors();
  const axis = { fill: colors.axis, fontSize: 12 };
  const single = data.length === 1;
  return (
    <Card>
      <CardHeader title="Monthly consumption" subtitle="Electricity used per month (kWh), all saved bills combined" />
      <div className="h-72 p-3 pt-5">
        {data.length === 0 ? (
          <div className="grid h-full place-items-center text-sm text-muted">No consumption data yet.</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 12, left: -12, bottom: 0 }}>
              <defs>
                <linearGradient id="kwhFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={colors.brand} stopOpacity={0.4} />
                  <stop offset="100%" stopColor={colors.brand} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={colors.grid} vertical={false} />
              <XAxis dataKey="short" tick={axis} axisLine={false} tickLine={false} />
              <YAxis tick={axis} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip format={fmtKwh} />} cursor={{ stroke: colors.brand, strokeOpacity: 0.3 }} />
              <Area type="monotone" dataKey="kwh" stroke={colors.brand} strokeWidth={2.5} fill="url(#kwhFill)"
                dot={single ? { r: 5, fill: colors.brand, stroke: colors.brand } : false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}