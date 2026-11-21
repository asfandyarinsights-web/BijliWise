import Card, { CardHeader } from "../ui/Card";
import { fmtKwh } from "../../utils/format";
import { monthLabel } from "../../utils/insights";

function Stat({ label, value, detail }) {
  return (
    <div className="rounded-xl border border-line bg-raised/40 p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-base font-bold">{value}</p>
      {detail && <p className="text-xs text-muted">{detail}</p>}
    </div>
  );
}

// Real saved bills of the selected household only. Households are never combined.
export default function HistoricalOverview({ readiness: r }) {
  const shown = r.history.slice(-12).reverse();
  return (
    <Card>
      <CardHeader title="Historical usage" subtitle={`Saved bills for ${r.reference} only`} />
      <div className="space-y-4 p-5">
        {r.observations === 0 ? (
          <p className="text-sm text-muted">This household has no valid monthly bills yet.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Stat label="Monthly bills" value={r.observations} />
              <Stat label="Total consumption" value={fmtKwh(r.totalKwh)} />
              <Stat label="Average per bill" value={r.avgKwh === null ? "Not available" : fmtKwh(r.avgKwh)} detail={r.avgKwh === null ? "Needs 2 or more bills" : undefined} />
              <Stat label="Coverage" value={`${r.observations} of ${r.spanMonths} months`}
                detail={`${monthLabel(r.firstMonth)}${r.firstMonth === r.lastMonth ? "" : ` to ${monthLabel(r.lastMonth)}`}`} />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[260px] text-left text-sm">
                <caption className="sr-only">Monthly consumption for {r.reference}, most recent first</caption>
                <thead>
                  <tr className="border-b border-line text-xs text-muted">
                    <th scope="col" className="py-2 pr-3 font-semibold">Month</th>
                    <th scope="col" className="py-2 text-right font-semibold">Consumption</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((h) => (
                    <tr key={h.month} className="border-b border-line last:border-0">
                      <th scope="row" className="py-2 pr-3 font-normal">{monthLabel(h.month)}</th>
                      <td className="py-2 text-right tabular-nums">{fmtKwh(h.units)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {r.history.length > shown.length && <p className="mt-2 text-xs text-muted">Showing the latest {shown.length} of {r.history.length} months.</p>}
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
