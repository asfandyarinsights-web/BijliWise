import Card, { CardHeader } from "../ui/Card";
import { formatPercent, formatSigned } from "../../utils/analytics";
import { fmtKwh, fmtPKR } from "../../utils/format";
import { monthLabel } from "../../utils/insights";

const dash = <span className="text-muted" title="Needs at least 2 bills">Not available</span>;

function Change({ change }) {
  if (!change) return <span className="text-muted">Needs 2+ bills</span>;
  const tone = change.unitsDiff > 0 ? "text-amber-300" : change.unitsDiff < 0 ? "text-brand" : "text-muted";
  return (
    <span>
      <span className={`font-semibold ${tone}`}>{formatSigned(change.unitsDiff, fmtKwh)}</span>
      {change.unitsPct !== null && <span className="text-muted"> ({formatPercent(change.unitsPct)})</span>}
      <span className="block text-xs text-muted">{monthLabel(change.fromMonth)} to {monthLabel(change.toMonth)}</span>
    </span>
  );
}

export default function HouseholdAnalysis({ households }) {
  return (
    <Card>
      <CardHeader
        title="Household consumption"
        subtitle="Grouped by household reference. Based only on the bills saved in BijliWise."
      />
      {households.length === 0 ? (
        <p className="p-5 text-sm text-muted">No household data yet.</p>
      ) : (
        <div className="overflow-x-auto p-5 pt-4">
          <table className="w-full min-w-[640px] text-left text-sm">
            <caption className="sr-only">Saved bills, consumption and expense for each household reference</caption>
            <thead>
              <tr className="border-b border-line text-xs text-muted">
                <th scope="col" className="py-2 pr-3 font-semibold">Household</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Bills</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Total consumption</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Total expense</th>
                <th scope="col" className="px-3 py-2 text-right font-semibold">Avg per bill</th>
                <th scope="col" className="py-2 pl-3 font-semibold">Latest change in consumption</th>
              </tr>
            </thead>
            <tbody>
              {households.map((h) => (
                <tr key={h.reference} className="border-b border-line last:border-0">
                  <th scope="row" className="py-3 pr-3 font-semibold">
                    {h.reference}
                    <span className="block text-xs font-normal text-muted">
                      {h.firstMonth === h.lastMonth ? monthLabel(h.firstMonth) : `${monthLabel(h.firstMonth)} to ${monthLabel(h.lastMonth)}`}
                    </span>
                  </th>
                  <td className="px-3 py-3 text-right tabular-nums">{h.bills}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{fmtKwh(h.units)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{fmtPKR(h.expense)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">
                    {h.avgUnits === null ? dash : (
                      <>
                        {fmtKwh(h.avgUnits)}
                        <span className="block text-xs text-muted">{fmtPKR(h.avgExpense)}</span>
                      </>
                    )}
                  </td>
                  <td className="py-3 pl-3"><Change change={h.change} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
