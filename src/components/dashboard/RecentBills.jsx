import { FileText } from "lucide-react";
import Card, { CardHeader } from "../ui/Card";
import DemoBadge from "../ui/DemoBadge";
import { fmtKwh, fmtPKR } from "../../utils/format";

export default function RecentBills({ bills, title = "Recent bills", subtitle = "Issue date, units and amount", action }) {
  return (
    <Card>
      <CardHeader title={title} subtitle={subtitle} action={action ?? <DemoBadge />} />
      <ul className="p-3">
        {bills.length === 0 && <li className="p-6 text-center text-sm text-muted">No bills match your search. Try a month, a bill ID or a status.</li>}
        {bills.map((b) => (
          <li key={b.id} className="flex items-center gap-3 rounded-xl p-3 transition hover:bg-raised/60">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand"><FileText size={18} /></span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{b.label} bill</p>
              <p className="truncate text-xs text-muted">{b.id} · Issued {b.issued}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold">{fmtPKR(b.bill)}</p>
              <p className="text-xs text-muted">{fmtKwh(b.kwh)}</p>
            </div>
            <span className={`hidden rounded-full px-2 py-0.5 text-xs font-semibold sm:inline ${b.status === "Due" ? "bg-amber-400/10 text-amber-300" : "bg-brand/10 text-brand"}`}>{b.status}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
