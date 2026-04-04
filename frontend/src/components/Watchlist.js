import React, { useState, useEffect, useMemo, useCallback } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Plus, RefreshCw, Trash2, Edit, Search, Check, X, ChevronDown, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, ClipboardCheck, Layers } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ChecklistPanel, { ChecklistScore } from "@/components/ChecklistPanel";

function PnlCell({ value, suffix = "" }) {
  if (value === undefined || value === null || value === 0) return <span className="text-gray-500">—</span>;
  const cls = value > 0 ? "text-profit" : value < 0 ? "text-loss" : "text-gray-400";
  return <span className={cls}>{value > 0 ? "+" : ""}{value.toFixed(2)}{suffix}</span>;
}

const SORT_COLUMNS = [
  { key: "ticker", label: "Ticker", num: false },
  { key: "last_price", label: "Price", num: true },
  { key: "change_pct", label: "Chg%", num: true },
  { key: "rs_spy", label: "RS/SPY", num: true },
  { key: "adr_pct", label: "ADR%", num: true },
  { key: "ext_10ema", label: "Ext 10E", num: true },
  { key: "ext_20ema", label: "Ext 20E", num: true },
  { key: "ext_50ema", label: "Ext 50E", num: true },
  { key: "combined_3d_pct", label: "3D Comb", num: true },
];

export default function Watchlist() {
  const [items, setItems] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [searching, setSearching] = useState(false);
  const [newTheme, setNewTheme] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editTheme, setEditTheme] = useState("");
  const [checklistItem, setChecklistItem] = useState(null);
  const [grouped, setGrouped] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState("asc");

  const load = useCallback(() => {
    Promise.all([api.getWatchlist(), api.getChecklistTemplates()])
      .then(([w, t]) => { setItems(w); setTemplates(t); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchResult(null);
    try {
      const res = await api.searchTicker(searchQuery.trim());
      setSearchResult(res);
    } catch {
      toast.error("Ticker not found");
    } finally {
      setSearching(false);
    }
  };

  const handleAdd = async () => {
    if (!searchResult) return;
    try {
      await api.addWatchlistItem({ ticker: searchResult.ticker, theme: newTheme, notes: newNotes });
      toast.success(`${searchResult.ticker} added`);
      setShowAdd(false);
      setSearchQuery("");
      setSearchResult(null);
      setNewTheme("");
      setNewNotes("");
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Failed to add");
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const updated = await api.refreshWatchlist();
      setItems(updated);
      toast.success("Market data refreshed");
    } catch {
      toast.error("Refresh failed");
    } finally {
      setRefreshing(false);
    }
  };

  const handleDelete = async (id, ticker) => {
    try {
      await api.deleteWatchlistItem(id);
      toast.success(`${ticker} removed`);
      load();
    } catch {
      toast.error("Delete failed");
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditTheme(item.theme || "");
  };

  const saveEdit = async (id) => {
    try {
      await api.updateWatchlistItem(id, { theme: editTheme });
      setEditingId(null);
      load();
    } catch {
      toast.error("Update failed");
    }
  };

  const handleSort = (colKey) => {
    if (sortCol === colKey) {
      if (sortDir === "asc") setSortDir("desc");
      else if (sortDir === "desc") { setSortCol(null); setSortDir("asc"); }
    } else {
      setSortCol(colKey);
      setSortDir("asc");
    }
  };

  const toggleGroup = (theme) => {
    setCollapsedGroups(prev => ({ ...prev, [theme]: !prev[theme] }));
  };

  const handleChecklistUpdate = (updatedItem) => {
    setItems(prev => prev.map(i => i.id === updatedItem.id ? updatedItem : i));
    setChecklistItem(updatedItem);
  };

  // Sort items
  const sortedItems = useMemo(() => {
    if (!sortCol) return items;
    return [...items].sort((a, b) => {
      const av = a[sortCol] ?? 0;
      const bv = b[sortCol] ?? 0;
      if (typeof av === "string") return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [items, sortCol, sortDir]);

  // Group by theme
  const groupedData = useMemo(() => {
    if (!grouped) return null;
    const groups = {};
    for (const item of sortedItems) {
      const theme = item.theme || "No Theme";
      if (!groups[theme]) groups[theme] = [];
      groups[theme].push(item);
    }
    return groups;
  }, [sortedItems, grouped]);

  const SortIcon = ({ colKey }) => {
    if (sortCol !== colKey) return <ArrowUpDown size={10} className="text-gray-600 ml-0.5" />;
    return sortDir === "asc"
      ? <ArrowUp size={10} className="text-blue-400 ml-0.5" />
      : <ArrowDown size={10} className="text-blue-400 ml-0.5" />;
  };

  const renderTableHead = () => (
    <thead>
      <tr>
        <th className="cursor-pointer select-none" onClick={() => handleSort("ticker")}>
          <span className="flex items-center">Ticker <SortIcon colKey="ticker" /></span>
        </th>
        <th>Theme</th>
        <th>CL</th>
        <th className="num cursor-pointer select-none" onClick={() => handleSort("last_price")}>
          <span className="flex items-center justify-end">Price <SortIcon colKey="last_price" /></span>
        </th>
        <th className="num cursor-pointer select-none" onClick={() => handleSort("change_pct")}>
          <span className="flex items-center justify-end">Chg% <SortIcon colKey="change_pct" /></span>
        </th>
        <th className="num cursor-pointer select-none" onClick={() => handleSort("rs_spy")}>
          <span className="flex items-center justify-end">RS/SPY <SortIcon colKey="rs_spy" /></span>
        </th>
        <th className="num cursor-pointer select-none" onClick={() => handleSort("adr_pct")}>
          <span className="flex items-center justify-end">ADR% <SortIcon colKey="adr_pct" /></span>
        </th>
        <th className="num cursor-pointer select-none" onClick={() => handleSort("ext_10ema")}>
          <span className="flex items-center justify-end">E10 <SortIcon colKey="ext_10ema" /></span>
        </th>
        <th className="num cursor-pointer select-none" onClick={() => handleSort("ext_20ema")}>
          <span className="flex items-center justify-end">E20 <SortIcon colKey="ext_20ema" /></span>
        </th>
        <th className="num cursor-pointer select-none" onClick={() => handleSort("ext_50ema")}>
          <span className="flex items-center justify-end">E50 <SortIcon colKey="ext_50ema" /></span>
        </th>
        <th className="num">D-1</th>
        <th className="num">D-2</th>
        <th className="num">D-3</th>
        <th className="num cursor-pointer select-none" onClick={() => handleSort("combined_3d_pct")}>
          <span className="flex items-center justify-end">3D <SortIcon colKey="combined_3d_pct" /></span>
        </th>
        <th className="num">&gt;ADR?</th>
        <th></th>
      </tr>
    </thead>
  );

  const renderRow = (item) => (
    <tr key={item.id} data-testid={`watchlist-row-${item.ticker}`}>
      <td className="text-white font-semibold">{item.ticker}</td>
      <td className="text-col">
        {editingId === item.id ? (
          <div className="flex items-center gap-1">
            <input
              data-testid="edit-theme-input"
              className="trading-input w-20 py-0.5 px-1.5 text-xs"
              value={editTheme}
              onChange={e => setEditTheme(e.target.value)}
              onKeyDown={e => e.key === "Enter" && saveEdit(item.id)}
            />
            <button onClick={() => saveEdit(item.id)} className="text-profit hover:text-green-300"><Check size={12} /></button>
            <button onClick={() => setEditingId(null)} className="text-loss hover:text-red-300"><X size={12} /></button>
          </div>
        ) : (
          <span className="tag tag-theme cursor-pointer" onClick={() => startEdit(item)}>
            {item.theme || "—"}
          </span>
        )}
      </td>
      <td>
        <button
          data-testid={`checklist-btn-${item.ticker}`}
          onClick={() => setChecklistItem(item)}
          className="hover:bg-white/5 p-1 rounded-sm transition-colors"
          title="Pre-trade checklist"
        >
          <ChecklistScore item={item} templates={templates} />
        </button>
      </td>
      <td className="num text-white">{item.last_price ? `$${item.last_price.toFixed(2)}` : "—"}</td>
      <td className="num"><PnlCell value={item.change_pct} suffix="%" /></td>
      <td className="num"><PnlCell value={item.rs_spy} /></td>
      <td className="num text-white">{item.adr_pct ? item.adr_pct.toFixed(2) : "—"}</td>
      <td className="num"><PnlCell value={item.ext_10ema} /></td>
      <td className="num"><PnlCell value={item.ext_20ema} /></td>
      <td className="num"><PnlCell value={item.ext_50ema} /></td>
      <td className="num"><PnlCell value={item.day1_pct} suffix="%" /></td>
      <td className="num"><PnlCell value={item.day2_pct} suffix="%" /></td>
      <td className="num"><PnlCell value={item.day3_pct} suffix="%" /></td>
      <td className="num"><PnlCell value={item.combined_3d_pct} suffix="%" /></td>
      <td className="num">
        {item.last_updated ? (
          <span className={item.combined_gt_adr ? "text-yellow-400 font-semibold" : "text-gray-500"}>
            {item.combined_gt_adr ? "YES" : "NO"}
          </span>
        ) : "—"}
      </td>
      <td>
        <div className="flex items-center gap-1">
          <button data-testid={`edit-${item.ticker}-btn`} onClick={() => startEdit(item)} className="p-1 text-gray-500 hover:text-white transition-colors">
            <Edit size={13} />
          </button>
          <button data-testid={`delete-${item.ticker}-btn`} onClick={() => handleDelete(item.id, item.ticker)} className="p-1 text-gray-500 hover:text-loss transition-colors">
            <Trash2 size={13} />
          </button>
        </div>
      </td>
    </tr>
  );

  if (loading) {
    return <div className="flex items-center justify-center h-64"><span className="text-gray-500 text-sm">Loading watchlist...</span></div>;
  }

  return (
    <div data-testid="watchlist-page">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-heading text-2xl font-medium tracking-tight">Watchlist</h2>
        <div className="flex items-center gap-3">
          <Button
            data-testid="toggle-grouped-btn"
            variant="outline"
            size="sm"
            onClick={() => setGrouped(!grouped)}
            className={`bg-transparent border-white/20 text-white hover:bg-white/5 rounded-sm text-xs gap-1.5 ${grouped ? "border-blue-500/50 text-blue-400" : ""}`}
          >
            <Layers size={13} />
            {grouped ? "Grouped" : "Group by Theme"}
          </Button>
          <Button
            data-testid="refresh-data-btn"
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="bg-transparent border-white/20 text-white hover:bg-white/5 rounded-sm text-xs gap-1.5"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
          <Button
            data-testid="add-ticker-btn"
            size="sm"
            onClick={() => setShowAdd(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-sm text-xs gap-1.5"
          >
            <Plus size={13} />
            Add Ticker
          </Button>
        </div>
      </div>

      {/* Watchlist Table */}
      <div className="border border-white/10 bg-[#0A0A0A] overflow-x-auto">
        {items.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500 text-sm font-body">No tickers in watchlist</p>
            <p className="text-gray-600 text-xs font-body mt-1">Click "Add Ticker" to get started</p>
          </div>
        ) : grouped && groupedData ? (
          /* Grouped View */
          <table className="data-table">
            {renderTableHead()}
            <tbody>
              {Object.entries(groupedData).sort(([a], [b]) => a === "No Theme" ? 1 : b === "No Theme" ? -1 : a.localeCompare(b)).map(([theme, groupItems]) => {
                const isCollapsed = collapsedGroups[theme];
                return (
                  <React.Fragment key={theme}>
                    <tr className="group-header">
                      <td
                        colSpan={16}
                        className="!px-3 !py-2 bg-[#111] cursor-pointer select-none"
                        onClick={() => toggleGroup(theme)}
                        data-testid={`theme-group-${theme}`}
                      >
                        <div className="flex items-center gap-2">
                          {isCollapsed ? <ChevronRight size={14} className="text-gray-500" /> : <ChevronDown size={14} className="text-gray-500" />}
                          <span className="tag tag-theme text-xs">{theme}</span>
                          <span className="text-[10px] font-mono text-gray-500">{groupItems.length} ticker{groupItems.length !== 1 ? "s" : ""}</span>
                        </div>
                      </td>
                    </tr>
                    {!isCollapsed && groupItems.map(renderRow)}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        ) : (
          /* Flat View */
          <table className="data-table">
            {renderTableHead()}
            <tbody>
              {sortedItems.map(renderRow)}
            </tbody>
          </table>
        )}
      </div>

      {items.length > 0 && items[0]?.last_updated && (
        <p className="text-[10px] text-gray-600 mt-2 font-mono">
          Last updated: {new Date(items[0].last_updated).toLocaleString()}
        </p>
      )}

      {/* Checklist Panel */}
      {checklistItem && (
        <ChecklistPanel
          item={checklistItem}
          templates={templates}
          onClose={() => setChecklistItem(null)}
          onUpdate={handleChecklistUpdate}
        />
      )}

      {/* Add Ticker Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="bg-[#0A0A0A] border-white/10 max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading text-white">Add to Watchlist</DialogTitle>
            <DialogDescription className="text-gray-400 text-sm">Search for a ticker symbol to add</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="flex gap-2">
              <Input
                data-testid="ticker-search-input"
                placeholder="AAPL, NVDA, TSLA..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                className="bg-[#141414] border-white/10 text-white font-mono"
              />
              <Button
                data-testid="search-ticker-btn"
                onClick={handleSearch}
                disabled={searching}
                className="bg-blue-600 hover:bg-blue-700 rounded-sm px-4"
              >
                <Search size={14} />
              </Button>
            </div>

            {searchResult && (
              <div className="border border-white/10 bg-[#141414] p-3 rounded-sm">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-white font-semibold">{searchResult.ticker}</span>
                  <span className="font-mono text-gray-400">${searchResult.last_price}</span>
                </div>
              </div>
            )}

            <div>
              <label className="text-xs uppercase tracking-wider text-gray-400 mb-1 block font-body">Theme / Sector</label>
              <Input
                data-testid="theme-input"
                placeholder="AI, EV, Energy..."
                value={newTheme}
                onChange={e => setNewTheme(e.target.value)}
                className="bg-[#141414] border-white/10 text-white"
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-gray-400 mb-1 block font-body">Notes</label>
              <Input
                data-testid="notes-input"
                placeholder="Optional notes..."
                value={newNotes}
                onChange={e => setNewNotes(e.target.value)}
                className="bg-[#141414] border-white/10 text-white"
              />
            </div>

            <Button
              data-testid="confirm-add-ticker-btn"
              onClick={handleAdd}
              disabled={!searchResult}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-sm"
            >
              Add {searchResult?.ticker || "Ticker"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
