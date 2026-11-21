import { Menu, Search } from "lucide-react";
import NotificationBell from "./NotificationBell";

export default function Topbar({ title, subtitle, search, onSearch, onMenu, isDemo = false, onNavigate }) {
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

      <NotificationBell key={isDemo ? "demo" : "real"} isDemo={isDemo} onNavigate={onNavigate} />

      <div className="flex items-center gap-3 rounded-xl border border-line bg-surface py-1.5 pl-1.5 pr-1.5 sm:pr-3">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand/15 text-sm font-bold text-brand">{isDemo ? "DU" : "HH"}</span>
        <div className="hidden leading-tight sm:block">
          <p className="text-sm font-semibold">{isDemo ? "Demo User" : "My household"}</p>
          <p className="text-xs text-muted">{isDemo ? "Demo profile" : "Saved bills"}</p>
        </div>
      </div>
    </header>
  );
}
