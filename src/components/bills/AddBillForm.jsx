import { useEffect, useRef, useState } from "react";
import { AlertCircle, Banknote, CalendarClock, CalendarDays, Hash, Loader2, Save, Wallet, X, Zap } from "lucide-react";
import Card, { CardHeader } from "../ui/Card";
import { createBill, updateBill } from "../../services/api";

const STATUSES = ["Paid", "Unpaid", "Overdue"];
const EMPTY = {
  consumer_reference: "",
  billing_month: "",
  units_consumed: "",
  total_amount: "",
  issue_date: "",
  due_date: "",
  payment_status: "Unpaid",
};
const FIELD_ORDER = Object.keys(EMPTY);
const fieldId = (name) => `bill-${name}`;

const numberToInput = (value) => {
  if (value === null || value === undefined || value === "") return "";
  const n = Number(value);
  return Number.isFinite(n) ? String(n) : "";
};

// Turns a raw API bill record into the string values the form inputs expect.
function toFormValues(bill) {
  return {
    consumer_reference: bill.consumer_reference ?? "",
    billing_month: bill.billing_month ? String(bill.billing_month).slice(0, 7) : "",
    units_consumed: numberToInput(bill.units_consumed),
    total_amount: numberToInput(bill.total_amount),
    issue_date: bill.issue_date ? String(bill.issue_date).slice(0, 10) : "",
    due_date: bill.due_date ? String(bill.due_date).slice(0, 10) : "",
    payment_status: STATUSES.includes(bill.payment_status) ? bill.payment_status : "Unpaid",
  };
}

// requireDates is false only when editing an older bill that was saved without dates
// (the backend allows empty dates), so such a bill is not blocked from being edited.
function validate(v, requireDates = true) {
  const e = {};
  const ref = v.consumer_reference.trim();
  if (!ref) e.consumer_reference = "Enter the consumer reference number.";
  else if (ref.length > 50) e.consumer_reference = "Use 50 characters or fewer.";

  if (!v.billing_month) e.billing_month = "Choose the billing month.";

  const units = Number(v.units_consumed);
  if (v.units_consumed === "") e.units_consumed = "Enter the units consumed.";
  else if (!Number.isFinite(units) || units <= 0) e.units_consumed = "Units must be a number greater than 0.";
  else if (units > 100000) e.units_consumed = "That looks too high. Check the value.";

  const amount = Number(v.total_amount);
  if (v.total_amount === "") e.total_amount = "Enter the total amount.";
  else if (!Number.isFinite(amount) || amount <= 0) e.total_amount = "Amount must be a number greater than 0.";
  else if (amount > 10000000) e.total_amount = "That looks too high. Check the value.";

  if (requireDates && !v.issue_date) e.issue_date = "Choose the issue date.";
  if (requireDates && !v.due_date) e.due_date = "Choose the due date.";
  else if (v.issue_date && v.due_date && v.due_date < v.issue_date) e.due_date = "Due date can't be before the issue date.";

  if (!STATUSES.includes(v.payment_status)) e.payment_status = "Choose a payment status.";
  return e;
}

function Field({ name, label, icon: Icon, error, hint, as: Control = "input", children, ...props }) {
  const id = fieldId(name);
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">{label}</label>
      <div className="relative">
        <Icon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <Control
          id={id}
          name={name}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`w-full rounded-xl border bg-base py-2.5 pl-10 pr-3 text-sm text-ink placeholder:text-muted [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-brand/30 disabled:opacity-60 ${
            error ? "border-rose-500/60" : "border-line focus:border-brand/50"
          }`}
          {...props}
        >
          {children}
        </Control>
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 flex items-center gap-1 text-xs text-rose-400">
          <AlertCircle size={12} /> {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-muted">{hint}</p>
      )}
    </div>
  );
}

// Create mode: no `bill` prop. Edit mode: pass the raw API record as `bill`.
// The parent should give the form a different `key` for each bill being edited.
export default function AddBillForm({ bill, onCancel, onCreated, onUpdated }) {
  const isEdit = Boolean(bill);
  const requireDates = !isEdit || Boolean(bill.issue_date && bill.due_date);

  const [values, setValues] = useState(() => (isEdit ? toFormValues(bill) : EMPTY));
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const submittingRef = useRef(false); // blocks double clicks before state updates
  const rootRef = useRef(null);

  // When editing, the list can be far below the form, so bring the form into view.
  useEffect(() => {
    if (isEdit) rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [isEdit]);

  const bind = (name) => ({
    value: values[name],
    error: errors[name],
    onChange: (e) => {
      const { value } = e.target;
      setValues((prev) => ({ ...prev, [name]: value }));
      if (errors[name]) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[name];
          return next;
        });
      }
    },
  });

  async function handleSubmit(e) {
    e.preventDefault();
    if (submittingRef.current) return;

    const found = validate(values, requireDates);
    setErrors(found);
    setSubmitError("");
    const firstInvalid = FIELD_ORDER.find((k) => found[k]);
    if (firstInvalid) {
      document.getElementById(fieldId(firstInvalid))?.focus();
      return;
    }

    const payload = {
      consumer_reference: values.consumer_reference.trim(),
      billing_month: `${values.billing_month}-01`,
      units_consumed: Number(values.units_consumed),
      total_amount: Number(values.total_amount),
      issue_date: values.issue_date || null,
      due_date: values.due_date || null,
      payment_status: values.payment_status,
    };

    submittingRef.current = true;
    setSubmitting(true);
    try {
      if (isEdit) {
        await updateBill(bill.id, payload);
        onUpdated?.(payload);
      } else {
        await createBill(payload);
        onCreated?.(payload);
      }
    } catch (err) {
      setSubmitError(err.message || `Something went wrong while ${isEdit ? "updating" : "saving"} the bill.`);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <div ref={rootRef}>
      <Card>
        <CardHeader
          title={isEdit ? "Edit electricity bill" : "Add electricity bill"}
          subtitle={isEdit ? "Change the details, then save your changes" : "Enter the details exactly as printed on the bill"}
          action={
            <button type="button" onClick={onCancel} disabled={submitting} aria-label="Close form"
              className="rounded-lg p-1.5 text-muted transition hover:text-ink disabled:opacity-50">
              <X size={18} />
            </button>
          }
        />
        <form onSubmit={handleSubmit} noValidate className="space-y-5 p-5">
          {submitError && (
            <div role="alert" className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
              <AlertCircle size={18} className="mt-0.5 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          <fieldset disabled={submitting} className="grid min-w-0 gap-4 border-0 p-0 sm:grid-cols-2">
            <Field name="consumer_reference" label="Consumer reference number" icon={Hash} placeholder="e.g. BW-10001" autoComplete="off" {...bind("consumer_reference")} />
            <Field name="billing_month" label="Billing month" icon={CalendarDays} type="month" {...bind("billing_month")} />
            <Field name="units_consumed" label="Units consumed (kWh)" icon={Zap} type="number" inputMode="decimal" step="any" min="0" placeholder="e.g. 250" {...bind("units_consumed")} />
            <Field name="total_amount" label="Total amount (PKR)" icon={Banknote} type="number" inputMode="decimal" step="any" min="0" placeholder="e.g. 8500" {...bind("total_amount")} />
            <Field name="issue_date" label="Issue date" icon={CalendarDays} type="date" {...bind("issue_date")} />
            <Field name="due_date" label="Due date" icon={CalendarClock} type="date" {...bind("due_date")} />
            <Field name="payment_status" label="Payment status" icon={Wallet} as="select" {...bind("payment_status")}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </Field>
          </fieldset>

          <div className="flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:justify-end">
            <button type="button" onClick={onCancel} disabled={submitting}
              className="rounded-xl border border-line px-4 py-2.5 text-sm font-semibold text-muted transition hover:text-ink disabled:cursor-not-allowed disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-base transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {submitting ? (isEdit ? "Saving changes…" : "Saving bill…") : isEdit ? "Save changes" : "Save bill"}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}