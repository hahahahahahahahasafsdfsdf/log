import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { X, Check, Circle, ClipboardCheck } from "lucide-react";

function evaluateAutoItem(template, item) {
  const { condition, auto_field, threshold, compare_field } = template;
  const val = item[auto_field];
  if (val === undefined || val === null) return null;
  if (condition === "gt") return val > (threshold || 0);
  if (condition === "lt_field") {
    const cmp = item[compare_field];
    if (cmp === undefined || cmp === null) return null;
    return val < cmp;
  }
  if (condition === "is_true") return !!val;
  return null;
}

export default function ChecklistPanel({ item, templates, onClose, onUpdate }) {
  const [manualChecks, setManualChecks] = useState(item.manual_checks || {});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setManualChecks(item.manual_checks || {});
  }, [item]);

  const toggleManual = async (templateId) => {
    const updated = { ...manualChecks, [templateId]: !manualChecks[templateId] };
    setManualChecks(updated);
    setSaving(true);
    try {
      const result = await api.updateManualChecks(item.id, updated);
      if (onUpdate) onUpdate(result);
    } catch {
      toast.error("Failed to save checklist");
    } finally {
      setSaving(false);
    }
  };

  const getScore = () => {
    let passed = 0;
    let total = templates.length;
    for (const t of templates) {
      if (t.type === "auto") {
        if (evaluateAutoItem(t, item) === true) passed++;
      } else {
        if (manualChecks[t.id]) passed++;
      }
    }
    return { passed, total };
  };

  const score = getScore();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="bg-[#0A0A0A] border border-white/10 w-full max-w-md mx-4 relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <ClipboardCheck size={16} className="text-blue-400" />
            <div>
              <h3 className="font-heading text-base font-medium text-white">{item.ticker}</h3>
              <p className="text-[10px] uppercase tracking-widest text-gray-500 mt-0.5">Pre-Trade Checklist</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span data-testid="checklist-score" className={`font-mono text-sm font-medium ${score.passed === score.total ? "text-profit" : score.passed > 0 ? "text-yellow-400" : "text-gray-500"}`}>
              {score.passed}/{score.total}
            </span>
            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Price context bar */}
        {item.last_price > 0 && (
          <div className="px-5 py-2 border-b border-white/5 flex items-center gap-4 text-xs font-mono">
            <span className="text-gray-400">Price: <span className="text-white">${item.last_price}</span></span>
            <span className="text-gray-400">ADR%: <span className="text-white">{item.adr_pct?.toFixed(2)}</span></span>
            <span className="text-gray-400">RS: <span className={item.rs_spy > 0 ? "text-profit" : "text-loss"}>{item.rs_spy}</span></span>
          </div>
        )}

        {/* Checklist Items */}
        <div className="p-3 space-y-1 max-h-[400px] overflow-y-auto">
          {templates.map(t => {
            const isAuto = t.type === "auto";
            const autoResult = isAuto ? evaluateAutoItem(t, item) : null;
            const isChecked = isAuto ? autoResult === true : !!manualChecks[t.id];
            const noData = isAuto && autoResult === null;

            return (
              <div
                key={t.id}
                data-testid={`checklist-item-${t.id}`}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-sm transition-colors duration-100 ${
                  isChecked ? "bg-green-500/5" : noData ? "bg-white/[0.02]" : "bg-red-500/5"
                }`}
              >
                {/* Check indicator */}
                {isAuto ? (
                  <div className={`w-5 h-5 flex items-center justify-center rounded-sm ${
                    noData ? "border border-white/10" : isChecked ? "bg-green-500/20 border border-green-500/40" : "bg-red-500/20 border border-red-500/40"
                  }`}>
                    {noData ? (
                      <Circle size={10} className="text-gray-600" />
                    ) : isChecked ? (
                      <Check size={12} className="text-profit" />
                    ) : (
                      <X size={12} className="text-loss" />
                    )}
                  </div>
                ) : (
                  <button
                    data-testid={`toggle-${t.id}`}
                    onClick={() => toggleManual(t.id)}
                    className={`w-5 h-5 flex items-center justify-center rounded-sm border transition-colors ${
                      isChecked
                        ? "bg-green-500/20 border-green-500/40"
                        : "border-white/20 hover:border-white/40"
                    }`}
                  >
                    {isChecked && <Check size={12} className="text-profit" />}
                  </button>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white font-body">{t.name}</span>
                    <span className={`text-[9px] uppercase tracking-widest px-1.5 py-0 rounded-sm font-mono ${
                      isAuto ? "text-blue-400 bg-blue-500/10 border border-blue-500/20" : "text-gray-400 bg-white/5 border border-white/10"
                    }`}>
                      {isAuto ? "AUTO" : "MANUAL"}
                    </span>
                  </div>
                  {t.description && (
                    <p className="text-[11px] text-gray-500 mt-0.5 font-body">{t.description}</p>
                  )}
                </div>

                {/* Auto value */}
                {isAuto && !noData && (
                  <span className={`text-xs font-mono ${isChecked ? "text-profit" : "text-loss"}`}>
                    {isChecked ? "PASS" : "FAIL"}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/10 flex items-center justify-between">
          <span className="text-[10px] text-gray-600 font-body">
            {saving ? "Saving..." : "Auto items update on refresh"}
          </span>
          <div className={`text-xs font-mono font-medium ${
            score.passed === score.total ? "text-profit" : "text-yellow-400"
          }`}>
            {score.passed === score.total ? "ALL CLEAR" : `${score.total - score.passed} remaining`}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ChecklistScore({ item, templates }) {
  let passed = 0;
  const total = templates.length;
  const manualChecks = item.manual_checks || {};
  for (const t of templates) {
    if (t.type === "auto") {
      if (evaluateAutoItem(t, item) === true) passed++;
    } else {
      if (manualChecks[t.id]) passed++;
    }
  }

  const pct = total > 0 ? (passed / total) * 100 : 0;

  return (
    <div className="flex items-center gap-1.5" data-testid={`checklist-score-${item.ticker}`}>
      <div className="w-10 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-150 ${
            pct === 100 ? "bg-green-500" : pct > 50 ? "bg-yellow-400" : pct > 0 ? "bg-orange-400" : "bg-white/10"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={`text-[10px] font-mono ${
        pct === 100 ? "text-profit" : pct > 0 ? "text-gray-400" : "text-gray-600"
      }`}>
        {passed}/{total}
      </span>
    </div>
  );
}
