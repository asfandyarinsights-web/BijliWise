import { useState } from "react";
import { Bell, Menu, Search } from "lucide-react";
import { notifications } from "../../data/demoData";

export default function Topbar({ title, subtitle, search, onSearch, onMenu }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b border-line bg-base/85 px-4 backdrop-blur md:px-8">
      <button onClick={onMenu} className="rounded-xl border border-line p-2 text-muted hover:text-ink lg:hidden" aria-label="Open menu"><Menu size={20} /></button>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-bold md:text-xl">{title}</h1>
        <p className="hidden truncate text-sm text-muted sm:block">{subtitle}</p>
      </div>

      <label className="relative hidden md:block">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input value={search} onChange={(e) => onSearch(e.target.value)} placeholder="Search bills…" aria-label="Search bills"
          className="w-60 rounded-xl border border-line bg-surface py-2 pl-9 pr-3 text-sm placeholder:text-muted focus:border-brand/50 focus:outline-none" />
      </label>

      <div className="relative">
        <button onClick={() => setOpen((o) => !o)} aria-label="Notifications" aria-expanded={open}
          className="relative rounded-xl border border-line bg-surface p-2.5 text-muted transition hover:text-ink">
          <Bell size={18} />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-brand" />
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden="true" />
            <div className="absolute right-0 z-40 mt-2 w-72 rounded-2xl border border-line bg-surface p-2 shadow-2xl">
              <p className="px-3 py-2 text-sm font-semibold">Notifications <span className="text-xs font-normal text-amber-300">(demo)</span></p>
              {notifications.map((n) => (
                <div key={n.id} className="rounded-xl px-3 py-2 hover:bg-raised/60">
                  <p className="text-sm">{n.text}</p>
                  <p className="text-xs text-muted">{n.time}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-line bg-surface py-1.5 pl-1.5 pr-1.5 sm:pr-3">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand/15 text-sm font-bold text-brand">DU</span>
        <div className="hidden leading-tight sm:block">
          <p className="text-sm font-semibold">Demo User</p>
          <p className="text-xs text-muted">Household account</p>
        </div>
      </div>
    </header>
  );
}
