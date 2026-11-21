import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { TrendingUp } from "lucide-react";
import Card, { CardHeader } from "../ui/Card";
import { useChartColors } from "../../hooks/useChartColors";
import { compactNumber } from "../../utils/analytics";
import { fmtKwh } from "../../utils/format";
import { buildChartSeries } from "../../utils/predictions";
import { monthLabel } from "../../utils/insights";

function ForecastTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  const forecastPoint = point.predicted !== null;
  return (
    <div className="rounded-xl border border-line bg-raised px-3 py-2 text-sm shadow-xl">
      <p className="font-semibold text-ink">{monthLabel(label)}</p>
      <p className="text-brand">{forecastPoint ? `Predicted: ${fmtKwh(point.predicted)}` : `Actual: ${fmtKwh(point.actual)}`}</p>
      {forecastPoint && point.range && <p className="text-xs text-muted">Range {fmtKwh(point.range[0])} to {fmtKwh(point.range[1])}</p>}
    </div>
  );
}

// Draws a chart only when the backend confirmed a real forecast. Otherwise it explains why not.
export default function ForecastChart({ forecast, message }) {
  const colors = useChartColors();
  const axis = { fill: colors.axis, fontSize: 12 };
  const ready = forecast?.available === true;
  const data = ready ? buildChartSeries(forecast.history, forecast.predictions) : [];

  return (
    <Card>
      <CardHeader title="Consumption forecast" subtitle="Actual monthly consumption (solid) and predicted consumption (dashed) for the selected household" />
      {ready ? (
        <div className="h-80 p-3 pt-5">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 5, right: 12, left: -12, bottom: 0 }}>
              <CartesianGrid stroke={colors.grid} vertical={false} />
              <XAxis dataKey="id" tick={axis} axisLine={false} tickLine={false} tickFormatter={monthLabel} interval="preserveStartEnd" minTickGap={16} />
              <YAxis tick={axis} axisLine={false} tickLine={false} tickFormatter={compactNumber} />
              <Tooltip content={<ForecastTooltip />} cursor={{ stroke: colors.brand, strokeOpacity: 0.3 }} />
              <Area dataKey="range" stroke="none" fill={colors.brand} fillOpacity={0.15} connectNulls={false} isAnimationActive={false} />
              <Line dataKey="actual" stroke={colors.brand} strokeWidth={2.5} dot={{ r: 3, fill: colors.brand }} connectNulls={false} />
              <Line dataKey="predicted" stroke={colors.brand} strokeWidth={2.5} strokeDasharray="6 5" dot={{ r: 3, fill: colors.brand }} connectNulls={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="grid place-items-center px-6 py-14 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-brand/10 text-brand"><TrendingUp size={22} aria-hidden="true" /></span>
          <p className="mt-4 text-base font-semibold">No forecast to show yet</p>
          <p className="mt-1 max-w-lg text-sm text-muted">{message}</p>
          <p className="mt-2 max-w-lg text-xs text-muted">
            A chart is drawn only from a real, validated forecast. Nothing on this page is estimated or simulated.
          </p>
        </div>
      )}
    </Card>
  );
}
