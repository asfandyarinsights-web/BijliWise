// Small label/value tile. Render inside a <dl>.
export default function StatTile({ label, value, hint }) {
  return (
    <div className="rounded-xl border border-line bg-raised/50 p-3">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="mt-1 text-sm font-semibold">{value}</dd>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}