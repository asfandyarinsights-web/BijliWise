import { useState } from "react";
import Sidebar from "./components/layout/Sidebar";
import Topbar from "./components/layout/Topbar";
import DashboardPage from "./pages/DashboardPage";
import BillsPage from "./pages/BillsPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import SettingsPage from "./pages/SettingsPage";
import PlaceholderPage from "./pages/PlaceholderPage";
import { navItems } from "./data/navigation";
import InsightsPage from "./pages/InsightsPage";

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");

  const item = navItems.find((n) => n.id === page);
  const go = (id) => { setPage(id); setMobileOpen(false); };

  return (
    <div className="flex h-full bg-base text-ink">
      <Sidebar active={page} onNavigate={go} collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)}
        mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title={item.title} subtitle={item.subtitle} search={search} onSearch={setSearch} onMenu={() => setMobileOpen(true)} />
        <main className="thin-scroll relative flex-1 overflow-y-auto p-4 md:p-8">
          {page === "dashboard" && <DashboardPage search={search} onNavigate={go} />}
          {page === "bills" && <BillsPage search={search} />}
          {page === "analytics" && <AnalyticsPage onNavigate={go} />}
          {page === "settings" && <SettingsPage onNavigate={go} />}
          {page === "insights" && <InsightsPage onNavigate={go} />}
          {!["dashboard", "bills", "analytics", "settings", "insights"].includes(page) && <PlaceholderPage item={item} onNavigate={go} />}
        </main>
      </div>
    </div>
  );
}