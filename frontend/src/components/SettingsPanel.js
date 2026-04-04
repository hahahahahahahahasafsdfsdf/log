import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";

export default function SettingsPanel() {
  const [settings, setSettings] = useState({ account_size: 100000, default_risk_pct: 1 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getSettings()
      .then(s => setSettings(s))
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

  if (loading) {
    return <div className="flex items-center justify-center h-64"><span className="text-gray-500 text-sm">Loading...</span></div>;
  }

  return (
    <div data-testid="settings-page">
      <h2 className="font-heading text-2xl font-medium tracking-tight mb-6">Settings</h2>

      <div className="border border-white/10 bg-[#0A0A0A] p-6 max-w-md">
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
    </div>
  );
}
