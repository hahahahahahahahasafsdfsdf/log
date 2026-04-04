import { useState } from "react";
import "@/App.css";
import { Toaster } from "sonner";
import { LayoutDashboard, Eye, Calculator, BookOpen, BarChart3, Settings } from "lucide-react";
import Dashboard from "@/components/Dashboard";
import Watchlist from "@/components/Watchlist";
import PositionSizer from "@/components/PositionSizer";
import TradeLog from "@/components/TradeLog";
import Analytics from "@/components/Analytics";
import SettingsPanel from "@/components/SettingsPanel";

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "watchlist", label: "Watchlist", icon: Eye },
  { key: "sizer", label: "Position Sizer", icon: Calculator },
  { key: "trades", label: "Trade Log", icon: BookOpen },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
  { key: "settings", label: "Settings", icon: Settings },
];

const PAGES = {
  dashboard: Dashboard,
  watchlist: Watchlist,
  sizer: PositionSizer,
  trades: TradeLog,
  analytics: Analytics,
  settings: SettingsPanel,
};

function App() {
  const [activePage, setActivePage] = useState("dashboard");
  const ActiveComponent = PAGES[activePage];

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 border-r border-white/10 bg-[#0A0A0A] flex flex-col">
        <div className="p-5 border-b border-white/10">
          <h1 className="font-heading text-lg font-semibold tracking-tight text-white">
            MomentumOS
          </h1>
          <p className="text-[10px] uppercase tracking-[0.15em] text-gray-500 mt-0.5 font-body">
            Trading System
          </p>
        </div>
        <nav className="flex-1 py-3">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              data-testid={`nav-${item.key}`}
              onClick={() => setActivePage(item.key)}
              className={`sidebar-nav-item w-full ${activePage === item.key ? "active" : ""}`}
            >
              <item.icon size={16} strokeWidth={1.5} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10">
          <p className="text-[10px] text-gray-600 font-mono">v1.0.0</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-6 lg:p-8">
          <ActiveComponent />
        </div>
      </main>

      <Toaster theme="dark" position="top-right" richColors />
    </div>
  );
}

export default App;
