export default function Card({ className = "", children }) {
  return (
    <section className={`rounded-2xl border border-line bg-surface shadow-lg shadow-black/25 ${className}`}>
      {children}
    </section>
  );
}

export function CardHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between gap-3 p-5 pb-0">
      <div>
        <h3 className="text-base font-semibold text-ink">{title}</h3>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
