import RecentBills from "../components/dashboard/RecentBills";
import { monthlyData } from "../data/demoData";

export function filterBills(bills, query) {
  const q = query.trim().toLowerCase();
  if (!q) return bills;
  return bills.filter((b) =>
    [b.label, b.id, b.status, String(b.bill), String(b.kwh)].some((v) => v.toLowerCase().includes(q)));
}

export default function BillsPage({ search }) {
  const bills = filterBills([...monthlyData].reverse(), search);
  return <RecentBills bills={bills} title="All electricity bills" subtitle={`${bills.length} of ${monthlyData.length} bills shown`} />;
}
