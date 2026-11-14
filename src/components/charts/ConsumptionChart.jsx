import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Card, { CardHeader } from "../ui/Card";
import DemoBadge from "../ui/DemoBadge";
import ChartTooltip from "./ChartTooltip";
import { fmtKwh } from "../../utils/format";

export default function ConsumptionChart({ data }) {
  return (
    <Card>
      <CardHeader title="Monthly consumption" subtitle="Electricity used per month (kWh)" action={<DemoBadge />} />
      <div className="h-72 p-3 pt-5">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 12, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id="kwhFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgb(148 163 184 / 0.12)" vertical={false} />
            <XAxis dataKey="short" tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 12 }} axisLine={false} tickLine={false} />
            <Tooltip content={<ChartTooltip format={fmtKwh} />} cursor={{ stroke: "#10b981", strokeOpacity: 0.3 }} />
            <Area type="monotone" dataKey="kwh" stroke="#10b981" strokeWidth={2.5} fill="url(#kwhFill)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
