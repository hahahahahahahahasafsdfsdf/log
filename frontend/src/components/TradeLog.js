import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Plus, Trash2, CheckCircle, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STRATEGY_TAGS = ["Breakout", "Pullback", "Gap-Up", "Momentum", "Mean Reversion", "Earnings", "Other"];
const SETUP_TYPES = ["Flag", "Base Break", "EP", "Kicker", "Power Earnings Gap", "Inside Day", "VCP", "Custom"];

export default function TradeLog() {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [showAdd, setShowAdd] = useState(false);
  const [showClose, setShowClose] = useState(null);
  const [form, setForm] = useState({
    ticker: "", side: "LONG", entry_price: "", shares: "",
    stop_loss: "", entry_date: new Date().toISOString().split("T")[0],
    strategy_tag: "", setup_type: "", notes: ""
  });
  const [closeForm, setCloseForm] = useState({
    exit_price: "", exit_date: new Date().toISOString().split("T")[0]
  });

  const load = () => {
    const status = statusFilter === "ALL" ? null : statusFilter;
    api.getTrades(status).then(setTrades).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const handleAdd = async () => {
    if (!form.ticker || !form.entry_price || !form.shares || !form.stop_loss) {
      toast.error("Fill in required fields");
      return;
    }
    try {
      await api.createTrade({
        ...form,
        entry_price: parseFloat(form.entry_price),
        shares: parseFloat(form.shares),
        stop_loss: parseFloat(form.stop_loss)
      });
      toast.success("Trade logged");
      setShowAdd(false);
      setForm({
        ticker: "", side: "LONG", entry_price: "", shares: "",
        stop_loss: "", entry_date: new Date().toISOString().split("T")[0],
        strategy_tag: "", setup_type: "", notes: ""
      });
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to log trade");
    }
  };

  const handleClose = async () => {
    if (!closeForm.exit_price || !showClose) return;
    try {
      await api.closeTrade(showClose.id, {
        exit_price: parseFloat(closeForm.exit_price),
        exit_date: closeForm.exit_date
      });
      toast.success("Trade closed");
      setShowClose(null);
      setCloseForm({ exit_price: "", exit_date: new Date().toISOString().split("T")[0] });
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to close trade");
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.deleteTrade(id);
      toast.success("Trade deleted");
      load();
    } catch {
      toast.error("Delete failed");
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><span className="text-gray-500 text-sm">Loading trades...</span></div>;
  }

  return (
    <div data-testid="trade-log-page">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-heading text-2xl font-medium tracking-tight">Trade Log</h2>
        <div className="flex items-center gap-3">
          {/* Status filter */}
          <div className="flex border border-white/10 rounded-sm overflow-hidden">
            {["ALL", "OPEN", "CLOSED"].map(s => (
              <button
                key={s}
                data-testid={`filter-${s.toLowerCase()}`}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 text-xs font-body transition-colors ${statusFilter === s ? "bg-blue-600 text-white" : "bg-transparent text-gray-400 hover:text-white"}`}
              >
                {s}
              </button>
            ))}
          </div>
          <Button
            data-testid="add-trade-btn"
            size="sm"
            onClick={() => setShowAdd(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-sm text-xs gap-1.5"
          >
            <Plus size={13} />
            Log Trade
          </Button>
        </div>
      </div>

      {/* Trades Table */}
      <div className="border border-white/10 bg-[#0A0A0A] overflow-x-auto">
        {trades.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500 text-sm font-body">No trades found</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Ticker</th>
                <th>Side</th>
                <th className="num">Entry</th>
                <th className="num">Exit</th>
                <th className="num">Shares</th>
                <th className="num">Stop</th>
                <th className="num">P&L</th>
                <th className="num">P&L%</th>
                <th className="num">R</th>
                <th>Strategy</th>
                <th>Setup</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {trades.map(t => (
                <tr key={t.id} data-testid={`trade-row-${t.id}`}>
                  <td className="text-gray-400 text-col">{t.entry_date}</td>
                  <td className="text-white font-semibold">{t.ticker}</td>
                  <td>
                    <span className={t.side === "LONG" ? "text-profit" : "text-loss"}>{t.side}</span>
                  </td>
                  <td className="num">${parseFloat(t.entry_price).toFixed(2)}</td>
                  <td className="num">{t.exit_price ? `$${parseFloat(t.exit_price).toFixed(2)}` : "—"}</td>
                  <td className="num">{t.shares}</td>
                  <td className="num">${parseFloat(t.stop_loss).toFixed(2)}</td>
                  <td className={`num ${t.pnl > 0 ? "text-profit" : t.pnl < 0 ? "text-loss" : "text-gray-500"}`}>
                    {t.status === "CLOSED" ? `$${t.pnl.toFixed(0)}` : "—"}
                  </td>
                  <td className={`num ${t.pnl_pct > 0 ? "text-profit" : t.pnl_pct < 0 ? "text-loss" : "text-gray-500"}`}>
                    {t.status === "CLOSED" ? `${t.pnl_pct.toFixed(1)}%` : "—"}
                  </td>
                  <td className={`num ${t.r_multiple > 0 ? "text-profit" : t.r_multiple < 0 ? "text-loss" : "text-gray-500"}`}>
                    {t.status === "CLOSED" ? `${t.r_multiple.toFixed(2)}R` : "—"}
                  </td>
                  <td className="text-col">
                    {t.strategy_tag ? <span className="tag tag-strategy">{t.strategy_tag}</span> : "—"}
                  </td>
                  <td className="text-col">
                    {t.setup_type ? <span className="tag tag-setup">{t.setup_type}</span> : "—"}
                  </td>
                  <td>
                    <span className={`tag ${t.status === "OPEN" ? "tag-theme" : "tag-win"}`}>{t.status}</span>
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      {t.status === "OPEN" && (
                        <button
                          data-testid={`close-trade-${t.id}-btn`}
                          onClick={() => { setShowClose(t); setCloseForm({ exit_price: "", exit_date: new Date().toISOString().split("T")[0] }); }}
                          className="p-1 text-gray-500 hover:text-profit transition-colors"
                          title="Close trade"
                        >
                          <CheckCircle size={13} />
                        </button>
                      )}
                      <button
                        data-testid={`delete-trade-${t.id}-btn`}
                        onClick={() => handleDelete(t.id)}
                        className="p-1 text-gray-500 hover:text-loss transition-colors"
                        title="Delete trade"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Trade Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="bg-[#0A0A0A] border-white/10 max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-white">Log New Trade</DialogTitle>
            <DialogDescription className="text-gray-400 text-sm">Enter your trade details</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <div>
              <label className="text-xs uppercase tracking-wider text-gray-400 mb-1 block font-body">Ticker *</label>
              <Input data-testid="trade-ticker-input" value={form.ticker} onChange={e => setForm({...form, ticker: e.target.value.toUpperCase()})} placeholder="AAPL" className="bg-[#141414] border-white/10 text-white font-mono" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-gray-400 mb-1 block font-body">Side</label>
              <Select value={form.side} onValueChange={v => setForm({...form, side: v})}>
                <SelectTrigger data-testid="trade-side-select" className="bg-[#141414] border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#141414] border-white/10">
                  <SelectItem value="LONG">LONG</SelectItem>
                  <SelectItem value="SHORT">SHORT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-gray-400 mb-1 block font-body">Entry Price *</label>
              <Input data-testid="trade-entry-price-input" type="number" step="0.01" value={form.entry_price} onChange={e => setForm({...form, entry_price: e.target.value})} placeholder="0.00" className="bg-[#141414] border-white/10 text-white font-mono" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-gray-400 mb-1 block font-body">Shares *</label>
              <Input data-testid="trade-shares-input" type="number" value={form.shares} onChange={e => setForm({...form, shares: e.target.value})} placeholder="100" className="bg-[#141414] border-white/10 text-white font-mono" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-gray-400 mb-1 block font-body">Stop Loss *</label>
              <Input data-testid="trade-stop-loss-input" type="number" step="0.01" value={form.stop_loss} onChange={e => setForm({...form, stop_loss: e.target.value})} placeholder="0.00" className="bg-[#141414] border-white/10 text-white font-mono" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-gray-400 mb-1 block font-body">Entry Date</label>
              <Input data-testid="trade-entry-date-input" type="date" value={form.entry_date} onChange={e => setForm({...form, entry_date: e.target.value})} className="bg-[#141414] border-white/10 text-white font-mono" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-gray-400 mb-1 block font-body">Strategy</label>
              <Select value={form.strategy_tag} onValueChange={v => setForm({...form, strategy_tag: v})}>
                <SelectTrigger data-testid="trade-strategy-select" className="bg-[#141414] border-white/10 text-white">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent className="bg-[#141414] border-white/10">
                  {STRATEGY_TAGS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-gray-400 mb-1 block font-body">Setup Type</label>
              <Select value={form.setup_type} onValueChange={v => setForm({...form, setup_type: v})}>
                <SelectTrigger data-testid="trade-setup-select" className="bg-[#141414] border-white/10 text-white">
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent className="bg-[#141414] border-white/10">
                  {SETUP_TYPES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <label className="text-xs uppercase tracking-wider text-gray-400 mb-1 block font-body">Notes</label>
              <Input data-testid="trade-notes-input" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Trade notes..." className="bg-[#141414] border-white/10 text-white" />
            </div>
          </div>
          <Button data-testid="log-trade-btn" onClick={handleAdd} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-sm mt-2">
            Log Trade
          </Button>
        </DialogContent>
      </Dialog>

      {/* Close Trade Dialog */}
      <Dialog open={!!showClose} onOpenChange={() => setShowClose(null)}>
        <DialogContent className="bg-[#0A0A0A] border-white/10 max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-heading text-white">Close Trade — {showClose?.ticker}</DialogTitle>
            <DialogDescription className="text-gray-400 text-sm">
              Entry: ${showClose?.entry_price.toFixed(2)} | Shares: {showClose?.shares}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            <div>
              <label className="text-xs uppercase tracking-wider text-gray-400 mb-1 block font-body">Exit Price</label>
              <Input data-testid="close-exit-price-input" type="number" step="0.01" value={closeForm.exit_price} onChange={e => setCloseForm({...closeForm, exit_price: e.target.value})} placeholder="0.00" className="bg-[#141414] border-white/10 text-white font-mono" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-gray-400 mb-1 block font-body">Exit Date</label>
              <Input data-testid="close-exit-date-input" type="date" value={closeForm.exit_date} onChange={e => setCloseForm({...closeForm, exit_date: e.target.value})} className="bg-[#141414] border-white/10 text-white font-mono" />
            </div>

            {/* Preview P&L */}
            {closeForm.exit_price && showClose && (
              <div className="border border-white/10 bg-[#141414] p-3 rounded-sm">
                {(() => {
                  const ep = showClose.entry_price;
                  const ex = parseFloat(closeForm.exit_price);
                  const pnl = showClose.side === "LONG" ? (ex - ep) * showClose.shares : (ep - ex) * showClose.shares;
                  const pnlPct = (pnl / (ep * showClose.shares)) * 100;
                  const rMul = showClose.risk_amount > 0 ? pnl / showClose.risk_amount : 0;
                  return (
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                        <div className="metric-label">P&L</div>
                        <div className={`font-mono text-sm font-medium ${pnl >= 0 ? "text-profit" : "text-loss"}`}>${pnl.toFixed(0)}</div>
                      </div>
                      <div>
                        <div className="metric-label">P&L %</div>
                        <div className={`font-mono text-sm font-medium ${pnlPct >= 0 ? "text-profit" : "text-loss"}`}>{pnlPct.toFixed(1)}%</div>
                      </div>
                      <div>
                        <div className="metric-label">R</div>
                        <div className={`font-mono text-sm font-medium ${rMul >= 0 ? "text-profit" : "text-loss"}`}>{rMul.toFixed(2)}R</div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
          <Button data-testid="confirm-close-trade-btn" onClick={handleClose} className="w-full bg-green-600 hover:bg-green-700 text-white rounded-sm mt-2">
            Close Trade
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
