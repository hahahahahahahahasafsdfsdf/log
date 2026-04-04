import { useState, useEffect, useMemo } from "react";
import { api } from "@/lib/api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";

function fmt(n, decimals = 2) {
  if (n === undefined || n === null || isNaN(n)) return "—";
  return n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

export default function PositionSizer() {
  const [settings, setSettings] = useState({ account_size: 100000, default_risk_pct: 1 });
  const [mode, setMode] = useState("risk_pct");

  // % Risk fields
  const [riskPct, setRiskPct] = useState(1);
  const [entryPrice, setEntryPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");

  // Fixed $ fields
  const [fixedAmount, setFixedAmount] = useState("");
  const [fixedEntry, setFixedEntry] = useState("");

  useEffect(() => {
    api.getSettings().then(s => {
      setSettings(s);
      setRiskPct(s.default_risk_pct || 1);
    }).catch(console.error);
  }, []);

  // % Risk calculations
  const riskCalc = useMemo(() => {
    const ep = parseFloat(entryPrice);
    const sl = parseFloat(stopLoss);
    if (!ep || !sl || ep <= 0 || sl <= 0 || ep === sl) return null;

    const riskAmount = settings.account_size * (riskPct / 100);
    const riskPerShare = Math.abs(ep - sl);
    const shares = Math.floor(riskAmount / riskPerShare);
    const totalPosition = shares * ep;
    const positionPct = (totalPosition / settings.account_size) * 100;
    const actualRisk = shares * riskPerShare;

    return {
      riskAmount: riskAmount,
      riskPerShare,
      shares,
      totalPosition,
      positionPct,
      actualRisk,
      side: sl < ep ? "LONG" : "SHORT"
    };
  }, [settings.account_size, riskPct, entryPrice, stopLoss]);

  // Fixed $ calculations
  const fixedCalc = useMemo(() => {
    const amount = parseFloat(fixedAmount);
    const ep = parseFloat(fixedEntry);
    if (!amount || !ep || ep <= 0) return null;

    const shares = Math.floor(amount / ep);
    const actualAmount = shares * ep;
    const positionPct = (actualAmount / settings.account_size) * 100;

    return { shares, actualAmount, positionPct };
  }, [fixedAmount, fixedEntry, settings.account_size]);

  return (
    <div data-testid="position-sizer-page">
      <h2 className="font-heading text-2xl font-medium tracking-tight mb-6">Position Sizer</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calculator */}
        <div className="border border-white/10 bg-[#0A0A0A] p-5">
          <div className="flex items-center gap-3 mb-5">
            <span className="metric-label">Account Size</span>
            <span className="font-mono text-white text-lg">${fmt(settings.account_size, 0)}</span>
          </div>

          <Tabs value={mode} onValueChange={setMode} className="w-full">
            <TabsList className="bg-[#141414] w-full mb-5">
              <TabsTrigger data-testid="tab-risk-pct" value="risk_pct" className="flex-1 text-xs font-body data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                % Risk
              </TabsTrigger>
              <TabsTrigger data-testid="tab-fixed-dollar" value="fixed_dollar" className="flex-1 text-xs font-body data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                Fixed Dollar
              </TabsTrigger>
            </TabsList>

            <TabsContent value="risk_pct">
              <div className="space-y-4">
                <div>
                  <label className="text-xs uppercase tracking-wider text-gray-400 mb-1 block font-body">Risk %</label>
                  <Input
                    data-testid="risk-pct-input"
                    type="number"
                    step="0.25"
                    value={riskPct}
                    onChange={e => setRiskPct(parseFloat(e.target.value) || 0)}
                    className="bg-[#141414] border-white/10 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-gray-400 mb-1 block font-body">Entry Price</label>
                  <Input
                    data-testid="entry-price-input"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={entryPrice}
                    onChange={e => setEntryPrice(e.target.value)}
                    className="bg-[#141414] border-white/10 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-gray-400 mb-1 block font-body">Stop Loss</label>
                  <Input
                    data-testid="stop-loss-input"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={stopLoss}
                    onChange={e => setStopLoss(e.target.value)}
                    className="bg-[#141414] border-white/10 text-white font-mono"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="fixed_dollar">
              <div className="space-y-4">
                <div>
                  <label className="text-xs uppercase tracking-wider text-gray-400 mb-1 block font-body">Dollar Amount</label>
                  <Input
                    data-testid="fixed-amount-input"
                    type="number"
                    step="100"
                    placeholder="10000"
                    value={fixedAmount}
                    onChange={e => setFixedAmount(e.target.value)}
                    className="bg-[#141414] border-white/10 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-gray-400 mb-1 block font-body">Entry Price</label>
                  <Input
                    data-testid="fixed-entry-input"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={fixedEntry}
                    onChange={e => setFixedEntry(e.target.value)}
                    className="bg-[#141414] border-white/10 text-white font-mono"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Results */}
        <div className="border border-white/10 bg-[#0A0A0A] p-5">
          <div className="metric-label mb-4">Calculation Result</div>

          {mode === "risk_pct" && riskCalc ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <ResultItem label="Direction" value={riskCalc.side} className={riskCalc.side === "LONG" ? "text-profit" : "text-loss"} />
                <ResultItem label="Shares" value={riskCalc.shares.toLocaleString()} className="text-white text-2xl" />
              </div>
              <div className="border-t border-white/5 pt-4 grid grid-cols-2 gap-4">
                <ResultItem label="Risk Amount" value={`$${fmt(riskCalc.actualRisk, 0)}`} className="text-loss" />
                <ResultItem label="Risk Per Share" value={`$${fmt(riskCalc.riskPerShare)}`} />
                <ResultItem label="Position Size" value={`$${fmt(riskCalc.totalPosition, 0)}`} />
                <ResultItem label="% of Account" value={`${fmt(riskCalc.positionPct, 1)}%`} />
              </div>
            </div>
          ) : mode === "fixed_dollar" && fixedCalc ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <ResultItem label="Shares" value={fixedCalc.shares.toLocaleString()} className="text-white text-2xl" />
                <ResultItem label="Actual Amount" value={`$${fmt(fixedCalc.actualAmount, 0)}`} />
              </div>
              <div className="border-t border-white/5 pt-4 grid grid-cols-2 gap-4">
                <ResultItem label="% of Account" value={`${fmt(fixedCalc.positionPct, 1)}%`} />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-500 text-sm font-body">
              Enter values to see position size
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ResultItem({ label, value, className = "text-white" }) {
  return (
    <div>
      <div className="metric-label mb-0.5">{label}</div>
      <div className={`font-mono font-medium ${className}`}>{value}</div>
    </div>
  );
}
