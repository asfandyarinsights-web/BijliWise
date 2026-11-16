import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Info } from "lucide-react";
import Card, { CardHeader } from "../ui/Card";
import ChartTooltip from "../charts/ChartTooltip";
import { useChartColors } from "../../hooks/useChartColors";
import { compactNumber } from "../../utils/analytics";
import { fmtKwh, fmtPKR } from "../../utils/format";

function Note({ children }) {
  return (
    <p className="mx-5 mb-5 flex items-start gap-2 rounded-xl border border-brand/20 bg-brand/5 px-3 py-2 text-xs text-muted">
      <Info size={14} className="mt-0.5 shrink-0 text-brand" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

// Shown under both charts. Month totals combine every saved bill of that month.
function limitNote(months, comparable) {
  if (months.length === 1) {
    return "Only one billing month is saved, so there is no pattern over time yet. Save bills for more months to see one.";
  }
  if (months.length > 1 && !comparable) {
    return "These months include bills from different household references, so a rise or fall between months is not one household's change.";
  }
  return null;
}

export default function InsightsCharts({ months, comparable }) {
  const colors = useChartColors();
  const axis = { fill: colors.axis, fontSize: 12 };
  const single = months.length === 1;
  const note = limitNote(months, comparable);
  const xAxisProps = { dataKey: "label", tick: axis, axisLine: false, tickLine: false, interval: "preserveStartEnd", minTickGap: 12 };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader title="Consumption overview" subtitle="Electricity used per billing month (kWh), all saved bills combined" />
        <div className="h-72 p-3 pt-5">
          {months.length === 0 ? (
            <div className="grid h-full place-items-center text-sm text-muted">No consumption data yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={months} margin={{ top: 5, right: 12, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="insightsKwhFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={colors.brand} stopOpacity={0.4} />
                    <stop offset="100%" stopColor={colors.brand} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={colors.grid} vertical={false} />
                <XAxis {...xAxisProps} />
                <YAxis tick={axis} axisLine={false} tickLine={false} tickFormatter={compactNumber} />
                <Tooltip content={<ChartTooltip format={fmtKwh} />} cursor={{ stroke: colors.brand, strokeOpacity: 0.3 }} />
                <Area type="monotone" dataKey="kwh" stroke={colors.brand} strokeWidth={2.5} fill="url(#insightsKwhFill)"
                  dot={single ? { r: 5, fill: colors.brand, stroke: colors.brand } : false} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
        {note && <Note>{note}</Note>}
      </Card>

      <Card>
        <CardHeader title="Electricity expense analysis" subtitle="Total amount of saved bills per billing month (PKR)" />
        <div className="h-72 p-3 pt-5">
          {months.length === 0 ? (
            <div className="grid h-full place-items-center text-sm text-muted">No expense data yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={months} margin={{ top: 5, right: 12, left: -4, bottom: 0 }}>
                <CartesianGrid stroke={colors.grid} vertical={false} />
                <XAxis {...xAxisProps} />
                <YAxis tick={axis} axisLine={false} tickLine={false} tickFormatter={compactNumber} />
                <Tooltip content={<ChartTooltip format={fmtPKR} />} cursor={{ fill: colors.cursor }} />
                <Bar dataKey="expense" fill={colors.brand} radius={[6, 6, 0, 0]} maxBarSize={34} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        {note && <Note>{note}</Note>}
      </Card>
    </div>
  );
}
