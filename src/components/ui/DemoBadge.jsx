export default function DemoBadge({ className = "" }) {
  return (
    <span className={`inline-flex shrink-0 items-center rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-xs font-semibold text-amber-300 ${className}`}>
      Demo data
    </span>
  );
}
