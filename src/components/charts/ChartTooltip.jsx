export default function ChartTooltip({ active, payload, label, format }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line bg-raised px-3 py-2 text-sm shadow-xl">
      <p className="font-semibold text-ink">{label}</p>
      <p className="text-brand">{format(payload[0].value)}</p>
    </div>
  );
}
