import { ChevronsLeft, ChevronsRight, X, Zap } from "lucide-react";
import { navItems } from "../../data/navigation";

export default function Sidebar({ active, onNavigate, collapsed, onToggle, mobileOpen, onClose }) {
  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={onClose} aria-hidden="true" />}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-line bg-surface transition-all duration-200 lg:static ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0 ${collapsed ? "lg:w-20" : "lg:w-64"}`}
      >
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand text-base"><Zap size={20} strokeWidth={2.5} /></span>
            <div className={collapsed ? "lg:hidden" : ""}>
              <p className="text-lg font-extrabold leading-none">BijliWise</p>
              <p className="mt-1 text-[11px] text-muted">Smart Energy. Smart Pakistan.</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted hover:text-ink lg:hidden" aria-label="Close menu"><X size={20} /></button>
        </div>

        <nav className="mt-4 flex-1 space-y-1 px-3" aria-label="Main">
          {navItems.map(({ id, label, icon: Icon }) => {
            const on = active === id;
            return (
              <button key={id} onClick={() => onNavigate(id)} title={label} aria-current={on ? "page" : undefined}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${collapsed ? "lg:justify-center" : ""} ${
                  on ? "bg-brand/15 text-brand" : "text-muted hover:bg-raised hover:text-ink"}`}>
                <Icon size={19} className="shrink-0" />
                <span className={collapsed ? "lg:hidden" : ""}>{label}</span>
              </button>
            );
          })}
        </nav>

        <div className="hidden border-t border-line p-3 lg:block">
          <button onClick={onToggle} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-muted transition hover:bg-raised hover:text-ink ${collapsed ? "justify-center" : ""}`}>
            {collapsed ? <ChevronsRight size={19} /> : <><ChevronsLeft size={19} /> Collapse</>}
          </button>
        </div>
      </aside>
    </>
  );
}
