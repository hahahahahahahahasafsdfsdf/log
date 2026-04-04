import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";

function MetricCard({ label, value, colorize = false }) {
  const isPos = typeof value === "string" && !value.startsWith("-") && value !== "$0" && value !== "0" && value !== "0.0%" && value !== "0.00";
  const isNeg = typeof value === "string" && value.startsWith("-");
  const cls = colorize ? (isPos ? "text-profit" : isNeg ? "text-loss" : "text-white") : "text-white";
  return (
    <div className="metric-card">
      <div className="metric-label">{label}</div>
      <div className={`font-mono text-xl font-medium mt-1 ${cls}`}>{value}</div>
    </div>
  );
}

function getHeatmapColor(pnl) {
  if (pnl > 5000) return "#00C805";
  if (pnl > 2000) return "rgba(0, 200, 5, 0.7)";
  if (pnl > 500) return "rgba(0, 200, 5, 0.4)";
  if (pnl > 0) return "rgba(0, 200, 5, 0.2)";
  if (pnl === 0) return "#1C1C1C";
  if (pnl > -500) return "rgba(255, 59, 48, 0.2)";
  if (pnl > -2000) return "rgba(255, 59, 48, 0.4)";
  if (pnl > -5000) return "rgba(255, 59, 48, 0.7)";
  return "#FF3B30";
}

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-[#141414] border border-white/10 p-2 text-xs font-mono">
        <div className="text-gray-400">{data.date || data.month}</div>
        {data.ticker && <div className="text-white">{data.ticker}</div>}
        {data.pnl !== undefined && (
          <div className={data.pnl >= 0 ? "text-profit" : "text-loss"}>
            P&L: ${data.pnl.toFixed(0)}
          </div>
        )}
        {data.cumulative !== undefined && (
          <div className="text-blue-400">Cumulative: ${data.cumulative.toFixed(0)}</div>
        )}
        {data.trades !== undefined && (
          <div className="text-gray-300">Trades: {data.trades}</div>
        )}
      </div>
    );
  }
  return null;
};

export default function Analytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAnalytics()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><span className="text-gray-500 text-sm">Loading analytics...</span></div>;
  }

  if (!data || data.summary.total_trades === 0) {
    return (
      <div data-testid="analytics-page">
        <h2 className="font-heading text-2xl font-medium tracking-tight mb-6">Analytics</h2>
        <div className="border border-white/10 bg-[#0A0A0A] p-12 text-center">
          <p className="text-gray-500 text-sm font-body">No closed trades to analyze yet.</p>
          <p className="text-gray-600 text-xs font-body mt-1">Close some trades to see your analytics.</p>
        </div>
      </div>
    );
  }

  const { summary, equity_curve, monthly, strategy_breakdown, setup_breakdown, best_trades, worst_trades } = data;

  return (
    <div data-testid="analytics-page">
      <h2 className="font-heading text-2xl font-medium tracking-tight mb-6">Analytics</h2>

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
        <MetricCard label="Total P&L" value={`$${summary.total_pnl.toLocaleString()}`} colorize />
        <MetricCard label="Win Rate" value={`${summary.win_rate}%`} />
        <MetricCard label="Profit Factor" value={summary.profit_factor.toFixed(2)} />
        <MetricCard label="Avg R" value={`${summary.avg_r_multiple}R`} colorize />
        <MetricCard label="Avg Win" value={`$${summary.avg_win.toFixed(0)}`} colorize />
        <MetricCard label="Avg Loss" value={`-$${summary.avg_loss.toFixed(0)}`} colorize />
      </div>

      {/* Equity Curve */}
      {equity_curve.length > 0 && (
        <div className="border border-white/10 bg-[#0A0A0A] p-5 mb-6">
          <div className="metric-label mb-4">Equity Curve</div>
          <div style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equity_curve}>
                <defs>
                  <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#007AFF" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#007AFF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#666", fontSize: 10, fontFamily: "JetBrains Mono" }}
                  axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#666", fontSize: 10, fontFamily: "JetBrains Mono" }}
                  axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                  tickLine={false}
                  tickFormatter={v => `$${v}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="linear"
                  dataKey="cumulative"
                  stroke="#007AFF"
                  strokeWidth={2}
                  fill="url(#equityGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Monthly Heatmap */}
        {monthly.length > 0 && (
          <div className="border border-white/10 bg-[#0A0A0A] p-5">
            <div className="metric-label mb-4">Monthly Performance</div>
            <div className="grid grid-cols-4 gap-1">
              {monthly.map(m => (
                <div
                  key={m.month}
                  data-testid={`heatmap-${m.month}`}
                  className="heatmap-cell"
                  style={{ backgroundColor: getHeatmapColor(m.pnl) }}
                >
                  <span className="text-gray-300 text-[10px]">{m.month}</span>
                  <span className={`font-semibold ${m.pnl >= 0 ? "text-white" : "text-white"}`}>
                    ${m.pnl.toLocaleString()}
                  </span>
                  <span className="text-gray-400 text-[10px]">{m.trades} trades</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Strategy Breakdown */}
        {strategy_breakdown.length > 0 && (
          <div className="border border-white/10 bg-[#0A0A0A] p-5">
            <div className="metric-label mb-4">Strategy Breakdown</div>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={strategy_breakdown} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: "#666", fontSize: 10, fontFamily: "JetBrains Mono" }}
                    axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                    tickLine={false}
                    tickFormatter={v => `$${v}`}
                  />
                  <YAxis
                    type="category"
                    dataKey="strategy"
                    tick={{ fill: "#A0A0A0", fontSize: 11, fontFamily: "IBM Plex Sans" }}
                    axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                    tickLine={false}
                    width={100}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="pnl" radius={0}>
                    {strategy_breakdown.map((entry, index) => (
                      <Cell key={index} fill={entry.pnl >= 0 ? "#00C805" : "#FF3B30"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 space-y-1">
              {strategy_breakdown.map(s => (
                <div key={s.strategy} className="flex items-center justify-between text-xs font-mono">
                  <span className="text-gray-400">{s.strategy}</span>
                  <span className="text-gray-500">{s.trades} trades | {s.wins} wins</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Setup Breakdown + Best/Worst */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Setup Type Breakdown */}
        {setup_breakdown.length > 0 && (
          <div className="border border-white/10 bg-[#0A0A0A] p-5">
            <div className="metric-label mb-3">Setup Type</div>
            <div className="space-y-2">
              {setup_breakdown.map(s => (
                <div key={s.setup} className="flex items-center justify-between">
                  <span className="tag tag-setup">{s.setup}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 font-mono">{s.trades}t</span>
                    <span className={`text-xs font-mono font-medium ${s.pnl >= 0 ? "text-profit" : "text-loss"}`}>
                      ${s.pnl.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Best Trades */}
        {best_trades.length > 0 && (
          <div className="border border-white/10 bg-[#0A0A0A] p-5">
            <div className="metric-label mb-3">Best Trades</div>
            <div className="space-y-2">
              {best_trades.slice(0, 5).map(t => (
                <div key={t.id} className="flex items-center justify-between">
                  <span className="text-xs font-mono text-white">{t.ticker}</span>
                  <span className="text-xs font-mono text-profit">${t.pnl.toFixed(0)} ({t.r_multiple.toFixed(1)}R)</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Worst Trades */}
        {worst_trades.length > 0 && (
          <div className="border border-white/10 bg-[#0A0A0A] p-5">
            <div className="metric-label mb-3">Worst Trades</div>
            <div className="space-y-2">
              {worst_trades.slice(0, 5).map(t => (
                <div key={t.id} className="flex items-center justify-between">
                  <span className="text-xs font-mono text-white">{t.ticker}</span>
                  <span className="text-xs font-mono text-loss">${t.pnl.toFixed(0)} ({t.r_multiple.toFixed(1)}R)</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
