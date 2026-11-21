import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import RecentBills from "../components/dashboard/RecentBills";
import AddBillForm from "../components/bills/AddBillForm";
import { deleteBill, getBills } from "../services/api";
import { useDemoMode } from "../context/demoModeContext";
import { fmtKwh, fmtPKR } from "../utils/format";
import { formatDisplayDate } from "../utils/dateFormat";
import { getActivePreferences } from "../utils/preferences";

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
  return formatDisplayDate(dateString, getActivePreferences().dateFormat);
}

export function mapBill(bill) {
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

function ConfirmDeleteDialog({ bill, deleting, error, onConfirm, onCancel }) {
  const cancelRef = useRef(null);

  // Start on the safe button so Enter does not delete by accident.
  useEffect(() => {
    cancelRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape" && !deleting) onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleting, onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !deleting) onCancel();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-bill-title"
        aria-describedby="delete-bill-desc"
        className="w-full max-w-md rounded-2xl border border-line bg-surface p-5 shadow-xl"
      >
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-rose-500/10 text-rose-400">
            <Trash2 size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 id="delete-bill-title" className="text-base font-semibold">Delete this bill?</h3>
            <p id="delete-bill-desc" className="mt-1 text-sm text-muted">
              This permanently removes the bill from the database. It cannot be undone.
            </p>
          </div>
        </div>

        <dl className="mt-4 space-y-1.5 rounded-xl border border-line bg-raised/50 p-3 text-sm">
          <div className="flex justify-between gap-3"><dt className="text-muted">Bill</dt><dd className="font-semibold">{bill.label}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-muted">Reference</dt><dd className="truncate font-semibold">{bill.reference || `Bill #${bill.id}`}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-muted">Units</dt><dd className="font-semibold">{fmtKwh(bill.kwh)}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-muted">Amount</dt><dd className="font-semibold">{fmtPKR(bill.bill)}</dd></div>
          <div className="flex justify-between gap-3"><dt className="text-muted">Status</dt><dd className="font-semibold">{bill.status}</dd></div>
        </dl>

        {error && (
          <div role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-sm text-rose-300">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={deleting}
            className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-muted transition hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-500 px-4 py-2.5 text-sm font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
            {deleting ? "Deleting…" : error ? "Try again" : "Delete bill"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BillsPage({ search = "" }) {
  const { isDemo } = useDemoMode();
  const [rawBills, setRawBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // null = form closed, { type: "create" }, or { type: "edit", bill: <raw API record> }
  const [formMode, setFormMode] = useState(null);
  const [notice, setNotice] = useState("");
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const deletingRef = useRef(false); // blocks double clicks before state updates

  const loadBills = useCallback(async () => {
    try {
      setError("");
      const data = await getBills();
      if (!Array.isArray(data)) throw new Error("The server sent an unexpected response.");
      setRawBills(data);
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

  const bills = useMemo(
    () => rawBills.filter((b) => b && typeof b === "object").map(mapBill),
    [rawBills]
  );

  async function handleCreated(saved) {
    setFormMode(null);
    setNotice(`Bill ${saved.consumer_reference} for ${formatMonth(saved.billing_month)} was saved.`);
    await loadBills();
  }

  async function handleUpdated(saved) {
    setFormMode(null);
    setNotice(`Bill ${saved.consumer_reference} for ${formatMonth(saved.billing_month)} was updated.`);
    await loadBills();
  }

  function openEdit(bill) {
    const raw = rawBills.find((b) => b && b.id === bill.id);
    if (!raw) return;
    setNotice("");
    setFormMode({ type: "edit", bill: raw });
  }

  function openDelete(bill) {
    setDeleteError("");
    setPendingDelete(bill);
  }

  const cancelDelete = useCallback(() => {
    if (deletingRef.current) return;
    setPendingDelete(null);
    setDeleteError("");
  }, []);

  async function confirmDelete() {
    if (!pendingDelete || deletingRef.current) return;
    const target = pendingDelete;

    deletingRef.current = true;
    setDeleting(true);
    setDeleteError("");

    try {
      await deleteBill(target.id);
    } catch (err) {
      setDeleteError(err.message || "The bill could not be deleted.");
      deletingRef.current = false;
      setDeleting(false);
      // 404 means the bill is already gone, so refresh to drop the stale row.
      if (err.status === 404) await loadBills();
      return;
    }

    // Only reached after the server confirmed the deletion.
    setRawBills((prev) => prev.filter((b) => !b || b.id !== target.id));
    setPendingDelete(null);
    setFormMode((cur) => (cur && cur.type === "edit" && cur.bill.id === target.id ? null : cur));
    setNotice(`Bill ${target.reference || `#${target.id}`} for ${target.label} was deleted.`);
    deletingRef.current = false;
    setDeleting(false);
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

      {formMode && (
        <AddBillForm
          key={formMode.type === "edit" ? `edit-${formMode.bill.id}` : "create"}
          bill={formMode.type === "edit" ? formMode.bill : undefined}
          onCancel={() => setFormMode(null)}
          onCreated={handleCreated}
          onUpdated={handleUpdated}
        />
      )}

      {!(error && bills.length === 0) && (
        <RecentBills
          bills={filteredBills}
          title="All electricity bills"
          subtitle={`${filteredBills.length} of ${bills.length} bills shown`}
          emptyMessage={
            bills.length === 0
              ? "No bills saved yet. Use Add bill to save your first one."
              : "No bills match your search. Try a month, a consumer reference or a status."
          }
          renderActions={(b) => isDemo ? <span className="text-xs text-muted">Read-only</span> : (
            <>
              <button
                type="button"
                onClick={() => openEdit(b)}
                aria-label={`Edit ${b.reference || "bill"} for ${b.label}`}
                title="Edit bill"
                className="rounded-lg p-2 text-muted transition hover:bg-brand/10 hover:text-brand"
              >
                <Pencil size={16} />
              </button>
              <button
                type="button"
                onClick={() => openDelete(b)}
                aria-label={`Delete ${b.reference || "bill"} for ${b.label}`}
                title="Delete bill"
                className="rounded-lg p-2 text-muted transition hover:bg-rose-500/10 hover:text-rose-400"
              >
                <Trash2 size={16} />
              </button>
            </>
          )}
          action={isDemo ? undefined :
            <button
              onClick={() => setFormMode((m) => (m ? null : { type: "create" }))}
              aria-expanded={Boolean(formMode)}
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-3 py-2 text-sm font-bold text-base transition hover:brightness-110"
            >
              {formMode ? <X size={16} /> : <Plus size={16} />}
              {formMode ? "Close form" : "Add bill"}
            </button>
          }
        />
      )}

      {pendingDelete && (
        <ConfirmDeleteDialog
          bill={pendingDelete}
          deleting={deleting}
          error={deleteError}
          onConfirm={confirmDelete}
          onCancel={cancelDelete}
        />
      )}
    </div>
  );
}