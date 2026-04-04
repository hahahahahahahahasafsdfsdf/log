import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Save, Plus, Trash2, ClipboardCheck } from "lucide-react";

export default function SettingsPanel() {
  const [settings, setSettings] = useState({ account_size: 100000, default_risk_pct: 1 });
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  useEffect(() => {
    Promise.all([api.getSettings(), api.getChecklistTemplates()])
      .then(([s, t]) => { setSettings(s); setTemplates(t); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await api.updateSettings({
        account_size: parseFloat(settings.account_size),
        default_risk_pct: parseFloat(settings.default_risk_pct)
      });
      setSettings(updated);
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleAddTemplate = async () => {
    if (!newName.trim()) { toast.error("Name required"); return; }
    try {
      const t = await api.addChecklistTemplate({
        name: newName.trim(),
        description: newDesc.trim(),
        order: templates.length + 1
      });
      setTemplates([...templates, t]);
      setNewName("");
      setNewDesc("");
      toast.success("Checklist item added");
    } catch {
      toast.error("Failed to add");
    }
  };

  const handleDeleteTemplate = async (id, name) => {
    try {
      await api.deleteChecklistTemplate(id);
      setTemplates(templates.filter(t => t.id !== id));
      toast.success(`"${name}" removed`);
    } catch {
      toast.error("Failed to delete");
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><span className="text-gray-500 text-sm">Loading...</span></div>;
  }

  return (
    <div data-testid="settings-page">
      <h2 className="font-heading text-2xl font-medium tracking-tight mb-6">Settings</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Account Settings */}
        <div className="border border-white/10 bg-[#0A0A0A] p-6">
          <div className="flex items-center gap-2 mb-5">
            <Save size={14} className="text-blue-400" />
            <span className="text-xs uppercase tracking-wider text-gray-400 font-body font-semibold">Account Settings</span>
          </div>
          <div className="space-y-5">
            <div>
              <label className="text-xs uppercase tracking-wider text-gray-400 mb-1 block font-body font-semibold">
                Account Size ($)
              </label>
              <Input
                data-testid="account-size-input"
                type="number"
                step="1000"
                value={settings.account_size}
                onChange={e => setSettings({ ...settings, account_size: e.target.value })}
                className="bg-[#141414] border-white/10 text-white font-mono text-lg"
              />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-gray-400 mb-1 block font-body font-semibold">
                Default Risk (%)
              </label>
              <Input
                data-testid="default-risk-input"
                type="number"
                step="0.25"
                value={settings.default_risk_pct}
                onChange={e => setSettings({ ...settings, default_risk_pct: e.target.value })}
                className="bg-[#141414] border-white/10 text-white font-mono text-lg"
              />
            </div>
            <Button
              data-testid="save-settings-btn"
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-sm gap-2"
            >
              <Save size={14} />
              {saving ? "Saving..." : "Save Settings"}
            </Button>
          </div>
        </div>

        {/* Checklist Template Management */}
        <div className="border border-white/10 bg-[#0A0A0A] p-6">
          <div className="flex items-center gap-2 mb-5">
            <ClipboardCheck size={14} className="text-blue-400" />
            <span className="text-xs uppercase tracking-wider text-gray-400 font-body font-semibold">Pre-Trade Checklist Items</span>
          </div>

          {/* Existing templates */}
          <div className="space-y-1 mb-5">
            {templates.map(t => (
              <div key={t.id} data-testid={`template-${t.id}`} className="flex items-center justify-between px-3 py-2 rounded-sm hover:bg-white/[0.03] transition-colors">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className={`text-[9px] uppercase tracking-widest px-1.5 rounded-sm font-mono ${
                    t.type === "auto" ? "text-blue-400 bg-blue-500/10 border border-blue-500/20" : "text-gray-400 bg-white/5 border border-white/10"
                  }`}>
                    {t.type === "auto" ? "AUTO" : "CUSTOM"}
                  </span>
                  <div className="min-w-0">
                    <span className="text-sm text-white font-body block truncate">{t.name}</span>
                    {t.description && <span className="text-[10px] text-gray-500 block truncate">{t.description}</span>}
                  </div>
                </div>
                <button
                  data-testid={`delete-template-${t.id}-btn`}
                  onClick={() => handleDeleteTemplate(t.id, t.name)}
                  className="p-1 text-gray-600 hover:text-loss transition-colors flex-shrink-0"
                  title="Delete checklist item"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>

          {/* Add new template */}
          <div className="border-t border-white/10 pt-4">
            <div className="metric-label mb-2">Add Custom Item</div>
            <div className="space-y-2">
              <Input
                data-testid="new-template-name-input"
                placeholder="Checklist item name..."
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="bg-[#141414] border-white/10 text-white text-sm"
              />
              <Input
                data-testid="new-template-desc-input"
                placeholder="Description (optional)..."
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                className="bg-[#141414] border-white/10 text-white text-sm"
              />
              <Button
                data-testid="add-template-btn"
                onClick={handleAddTemplate}
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-sm text-xs gap-1.5"
              >
                <Plus size={12} />
                Add Item
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
