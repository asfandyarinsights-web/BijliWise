import { useEffect, useState } from "react";
import { Bell, Check, CheckCheck, Info, Receipt, RefreshCw, Sparkles, Trash2, Zap } from "lucide-react";
import useNotifications from "../../hooks/useNotifications";

const CATEGORY = {
  Bill: { icon: Receipt, tone: "bg-brand/10 text-brand" },
  Energy: { icon: Zap, tone: "bg-amber-400/10 text-amber-300" },
  Prediction: { icon: Sparkles, tone: "bg-brand/10 text-brand" },
  System: { icon: Info, tone: "bg-raised text-muted" },
};

function timeAgo(iso) {
  const then = new Date(iso);
  if (Number.isNaN(then.getTime())) return "";
  const minutes = Math.round((Date.now() - then.getTime()) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} d ago`;
  return then.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function NotificationBell({ isDemo, onNavigate }) {
  const [open, setOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const n = useNotifications({ isDemo, open });

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") { setOpen(false); setConfirmClear(false); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => { setOpen(false); setConfirmClear(false); };
  const badge = n.unread > 99 ? "99+" : String(n.unread);

  function openItem(item) {
    if (!item.is_read) n.markRead(item.id);
    if (item.action_path) { onNavigate?.(item.action_path); close(); }
  }

  return (
    <div className="relative">
      <button onClick={() => (open ? close() : setOpen(true))} aria-expanded={open} aria-haspopup="dialog"
        aria-label={n.unread > 0 ? `Notifications, ${n.unread} unread` : "Notifications"}
        className="relative rounded-xl border border-line bg-surface p-2.5 text-muted transition hover:text-ink">
        <Bell size={18} />
        {n.unread > 0 && (
          <span className="absolute -right-1.5 -top-1.5 grid min-w-[1.15rem] place-items-center rounded-full bg-brand px-1 text-[10px] font-bold leading-[1.15rem] text-base">
            {badge}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={close} aria-hidden="true" />
          <div role="dialog" aria-label="Notifications"
            className="absolute right-0 z-40 mt-2 w-[min(24rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface shadow-2xl">
            <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
              <p className="text-sm font-semibold">
                Notifications {isDemo && <span className="text-xs font-normal text-amber-300">(demo, not saved)</span>}
              </p>
              <div className="flex items-center gap-1">
                <button onClick={n.reload} aria-label="Refresh notifications" title="Refresh" disabled={n.loading}
                  className="rounded-lg p-1.5 text-muted transition hover:bg-raised hover:text-ink disabled:opacity-50">
                  <RefreshCw size={15} className={n.loading ? "motion-safe:animate-spin" : ""} />
                </button>
                <button onClick={n.markAllRead} disabled={n.unread === 0} title="Mark all as read"
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-muted transition hover:bg-raised hover:text-brand disabled:opacity-40">
                  <CheckCheck size={14} /> Mark all read
                </button>
              </div>
            </div>

            {n.error && (
              <div role="alert" className="m-3 flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                <span className="min-w-0 flex-1">{n.error}</span>
                <button onClick={n.reload} className="rounded-md border border-rose-400/30 px-2 py-1 font-semibold hover:bg-rose-500/10">Try again</button>
              </div>
            )}

            <div className="thin-scroll max-h-[min(26rem,60vh)] overflow-y-auto p-2">
              {n.loading && n.items.length === 0 ? (
                <div className="space-y-2 p-1 motion-safe:animate-pulse" role="status" aria-label="Loading notifications">
                  {[0, 1, 2].map((i) => <div key={i} className="h-14 rounded-xl bg-raised/60" />)}
                </div>
              ) : n.items.length === 0 && !n.error ? (
                <div className="px-4 py-10 text-center">
                  <span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-brand/10 text-brand"><Bell size={20} /></span>
                  <p className="mt-3 text-sm font-semibold">You are all caught up</p>
                  <p className="mt-1 text-xs text-muted">New notifications appear here when you save a bill or your usage changes.</p>
                </div>
              ) : (
                <ul className="space-y-1">
                  {n.items.map((item) => {
                    const meta = CATEGORY[item.category] ?? CATEGORY.System;
                    const Icon = meta.icon;
                    return (
                      <li key={item.id} className={`group flex gap-3 rounded-xl p-3 ${item.is_read ? "" : "bg-brand/5"} hover:bg-raised/60`}>
                        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${meta.tone}`}><Icon size={17} aria-hidden="true" /></span>
                        <button onClick={() => openItem(item)} className="min-w-0 flex-1 text-left">
                          <span className="flex items-center gap-2">
                            <span className={`truncate text-sm ${item.is_read ? "font-medium" : "font-bold"}`}>{item.title}</span>
                            {!item.is_read && <span className="h-2 w-2 shrink-0 rounded-full bg-brand" aria-label="Unread" />}
                          </span>
                          <span className="mt-0.5 block text-xs text-muted">{item.message}</span>
                          <span className="mt-1 block text-[11px] text-muted">{item.category} · {timeAgo(item.created_at)}</span>
                        </button>
                        <span className="flex shrink-0 flex-col gap-1">
                          {!item.is_read && (
                            <button onClick={() => n.markRead(item.id)} aria-label={`Mark "${item.title}" as read`} title="Mark as read"
                              className="rounded-lg p-1.5 text-muted transition hover:bg-brand/10 hover:text-brand"><Check size={14} /></button>
                          )}
                          <button onClick={() => n.remove(item.id)} aria-label={`Delete "${item.title}"`} title="Delete"
                            className="rounded-lg p-1.5 text-muted transition hover:bg-rose-500/10 hover:text-rose-400"><Trash2 size={14} /></button>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {n.items.length > 0 && (
              <div className="border-t border-line px-4 py-2.5">
                {confirmClear ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-semibold">Delete all notifications?</span>
                    <span className="flex gap-2">
                      <button onClick={() => setConfirmClear(false)} className="rounded-lg border border-line px-3 py-1.5 font-semibold hover:text-brand">Cancel</button>
                      <button onClick={() => { n.clearAll(); setConfirmClear(false); }}
                        className="rounded-lg border border-rose-400/30 px-3 py-1.5 font-semibold text-rose-300 hover:bg-rose-500/10">Yes, clear all</button>
                    </span>
                  </div>
                ) : (
                  <button onClick={() => setConfirmClear(true)} className="text-xs font-semibold text-muted transition hover:text-rose-400">Clear all</button>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
