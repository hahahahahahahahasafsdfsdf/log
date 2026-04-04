import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { TrendingUp, TrendingDown, Activity, Target, DollarSign, BarChart3 } from "lucide-react";

function MetricCard({ label, value, prefix = "", suffix = "", colorize = false }) {
  const isPositive = typeof value === "number" && value > 0;
  const isNegative = typeof value === "number" && value < 0;
  const colorClass = colorize
    ? isPositive ? "text-profit" : isNegative ? "text-loss" : "text-white"
    : "text-white";

  return (
    <div className="metric-card" data-testid={`metric-${label.toLowerCase().replace(/\s+/g, '-')}`}>
      <div className="metric-label">{label}</div>
      <div className={`metric-value mt-1 ${colorClass}`}>
        {prefix}{typeof value === "number" ? value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : value}{suffix}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [settings, setSettings] = useState(null);
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getAnalytics(), api.getSettings(), api.getTrades()])
      .then(([a, s, t]) => {
        setAnalytics(a);
        setSettings(s);
        setTrades(t);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 font-body text-sm">Loading dashboard...</div>
      </div>
    );
  }

  const summary = analytics?.summary || {};
  const openTrades = trades.filter(t => t.status === "OPEN");
  const recentClosed = trades
    .filter(t => t.status === "CLOSED")
    .sort((a, b) => (b.exit_date || "").localeCompare(a.exit_date || ""))
    .slice(0, 5);

  return (
    <div data-testid="dashboard-page">
      <h2 className="font-heading text-2xl font-medium tracking-tight mb-6">Dashboard</h2>

      {/* Top Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <MetricCard label="Account Size" value={settings?.account_size || 0} prefix="$" />
        <MetricCard label="Total P&L" value={summary.total_pnl || 0} prefix="$" colorize />
        <MetricCard label="Win Rate" value={summary.win_rate || 0} suffix="%" />
        <MetricCard label="Profit Factor" value={summary.profit_factor || 0} />
        <MetricCard label="Avg R" value={summary.avg_r_multiple || 0} suffix="R" colorize />
        <MetricCard label="Open Positions" value={summary.open_positions || 0} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Open Positions */}
        <div className="border border-white/10 bg-[#0A0A0A]">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-white/10">
            <Activity size={14} className="text-blue-400" />
            <span className="text-xs uppercase tracking-wider text-gray-400 font-body font-semibold">Open Positions</span>
            <span className="ml-auto text-xs font-mono text-gray-500">{openTrades.length}</span>
          </div>
          <div className="overflow-x-auto">
            {openTrades.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm font-body">No open positions</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ticker</th>
                    <th>Side</th>
                    <th className="num">Entry</th>
                    <th className="num">Shares</th>
                    <th className="num">Stop</th>
                    <th className="num">Risk $</th>
                  </tr>
                </thead>
                <tbody>
                  {openTrades.map(t => (
                    <tr key={t.id} data-testid={`open-trade-${t.ticker}`}>
                      <td className="text-white font-semibold">{t.ticker}</td>
                      <td>
                        <span className={t.side === "LONG" ? "text-profit" : "text-loss"}>
                          {t.side}
                        </span>
                      </td>
                      <td className="num">${t.entry_price.toFixed(2)}</td>
                      <td className="num">{t.shares}</td>
                      <td className="num">${t.stop_loss.toFixed(2)}</td>
                      <td className="num text-loss">${t.risk_amount.toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Recent Closed Trades */}
        <div className="border border-white/10 bg-[#0A0A0A]">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-white/10">
            <BarChart3 size={14} className="text-blue-400" />
            <span className="text-xs uppercase tracking-wider text-gray-400 font-body font-semibold">Recent Trades</span>
          </div>
          <div className="overflow-x-auto">
            {recentClosed.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm font-body">No closed trades yet</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ticker</th>
                    <th>Date</th>
                    <th className="num">P&L</th>
                    <th className="num">P&L %</th>
                    <th className="num">R</th>
                  </tr>
                </thead>
                <tbody>
                  {recentClosed.map(t => (
                    <tr key={t.id} data-testid={`recent-trade-${t.ticker}`}>
                      <td className="text-white font-semibold">{t.ticker}</td>
                      <td className="text-gray-400">{t.exit_date}</td>
                      <td className={`num ${t.pnl >= 0 ? "text-profit" : "text-loss"}`}>
                        ${t.pnl.toFixed(0)}
                      </td>
                      <td className={`num ${t.pnl_pct >= 0 ? "text-profit" : "text-loss"}`}>
                        {t.pnl_pct.toFixed(1)}%
                      </td>
                      <td className={`num ${t.r_multiple >= 0 ? "text-profit" : "text-loss"}`}>
                        {t.r_multiple.toFixed(2)}R
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Summary Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <div className="metric-card flex items-center gap-3">
          <div className="p-2 bg-green-500/10 rounded-sm">
            <TrendingUp size={16} className="text-profit" />
          </div>
          <div>
            <div className="metric-label">Avg Win</div>
            <div className="font-mono text-lg text-profit">${(summary.avg_win || 0).toFixed(0)}</div>
          </div>
        </div>
        <div className="metric-card flex items-center gap-3">
          <div className="p-2 bg-red-500/10 rounded-sm">
            <TrendingDown size={16} className="text-loss" />
          </div>
          <div>
            <div className="metric-label">Avg Loss</div>
            <div className="font-mono text-lg text-loss">${(summary.avg_loss || 0).toFixed(0)}</div>
          </div>
        </div>
        <div className="metric-card flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-sm">
            <Target size={16} className="text-blue-400" />
          </div>
          <div>
            <div className="metric-label">Expectancy</div>
            <div className={`font-mono text-lg ${(summary.expectancy || 0) >= 0 ? "text-profit" : "text-loss"}`}>
              ${(summary.expectancy || 0).toFixed(0)}
            </div>
          </div>
        </div>
        <div className="metric-card flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-sm">
            <DollarSign size={16} className="text-blue-400" />
          </div>
          <div>
            <div className="metric-label">Total Trades</div>
            <div className="font-mono text-lg text-white">{summary.total_trades || 0}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
