import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Plus, X } from "lucide-react";
import RecentBills from "../components/dashboard/RecentBills";
import AddBillForm from "../components/bills/AddBillForm";
import { getBills } from "../services/api";

export function filterBills(bills, query) {
  const q = query.trim().toLowerCase();

  if (!q) return bills;

  return bills.filter((b) =>
    [
      b.label,
      b.id,
      b.reference,
      b.status,
      String(b.bill),
      String(b.kwh),
    ].some((value) =>
      String(value ?? "").toLowerCase().includes(q)
    )
  );
}

function formatMonth(dateString) {
  if (!dateString) return "Unknown month";

  const date = new Date(`${dateString}T00:00:00`);

  return date.toLocaleDateString("en-PK", {
    month: "long",
    year: "numeric",
  });
}

function formatDate(dateString) {
  if (!dateString) return "Not available";

  const date = new Date(`${dateString}T00:00:00`);

  return date.toLocaleDateString("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function mapBill(bill) {
  return {
    id: bill.id,
    label: formatMonth(bill.billing_month),
    issued: formatDate(bill.issue_date || bill.billing_month),
    bill: Number(bill.total_amount),
    kwh: Number(bill.units_consumed),
    status:
      bill.payment_status === "Paid"
        ? "Paid"
        : bill.payment_status === "Overdue"
          ? "Overdue"
          : "Due",
    reference: bill.consumer_reference,
  };
}

export default function BillsPage({ search = "" }) {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [notice, setNotice] = useState("");

  const loadBills = useCallback(async () => {
    try {
      setError("");
      const data = await getBills();
      setBills(data.map(mapBill));
    } catch (err) {
      setError(err.message || "Unable to load electricity bills.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBills();
  }, [loadBills]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(timer);
  }, [notice]);

  async function handleCreated(saved) {
    setShowForm(false);
    setNotice(`Bill ${saved.consumer_reference} for ${formatMonth(saved.billing_month)} was saved.`);
    await loadBills();
  }

  const filteredBills = filterBills(bills, search);

  if (loading) {
    return <p className="p-6 text-sm text-muted">Loading electricity bills...</p>;
  }

  return (
    <div className="space-y-4">
      {notice && (
        <div role="status" className="flex items-start gap-2 rounded-xl border border-brand/30 bg-brand/10 px-4 py-3 text-sm text-brand">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          <span className="flex-1">{notice}</span>
          <button onClick={() => setNotice("")} aria-label="Dismiss message" className="text-brand/70 hover:text-brand"><X size={16} /></button>
        </div>
      )}

      {error && (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          <span className="flex-1">{error}</span>
          <button onClick={loadBills} className="rounded-lg border border-rose-400/30 px-3 py-1 font-semibold hover:bg-rose-500/10">Try again</button>
        </div>
      )}

      {showForm && <AddBillForm onCancel={() => setShowForm(false)} onCreated={handleCreated} />}

      {!(error && bills.length === 0) && (
        <RecentBills
          bills={filteredBills}
          title="All electricity bills"
          subtitle={`${filteredBills.length} of ${bills.length} bills shown`}
          action={
            <button
              onClick={() => setShowForm((open) => !open)}
              aria-expanded={showForm}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-3 py-2 text-sm font-bold text-base transition hover:brightness-110"
            >
              {showForm ? <X size={16} /> : <Plus size={16} />}
              {showForm ? "Close form" : "Add bill"}
            </button>
          }
        />
      )}
    </div>
  );
}
