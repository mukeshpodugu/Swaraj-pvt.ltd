import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Sliders,
  Database,
  History,
  Mail,
  Smartphone,
  Save,
  CheckCircle,
  FileDown,
  FileUp,
  Clock,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';

export default function Settings() {
  const [settings, setSettings] = useState({
    companyName: 'Swaraj Pvt. Limited',
    address: '123 Swaraj Chowk, Finance District, New Delhi',
    baseInterestRate: 12.0,
    basePenaltyRate: 2.0,
    smtpHost: 'smtp.mailtrap.io',
    smtpPort: 2525,
    smtpUser: '',
    smtpPass: '',
    smtpFrom: 'no-reply@swarajfinance.com',
    smsApiKey: '',
    whatsappApiKey: ''
  });
  
  const [logsTab, setLogsTab] = useState<'audit' | 'notifications'>('audit');
  const [systemLogs, setSystemLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadSettings();
    loadLogs();
  }, [logsTab]);

  async function loadSettings() {
    try {
      setLoading(true);
      const res = await axios.get('/api/settings');
      if (res.data) {
        setSettings(res.data);
      }
    } catch (err) {
      console.error('Failed to load settings', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadLogs() {
    try {
      setLogsLoading(true);
      const res = await axios.get('/api/settings/logs', {
        params: { type: logsTab === 'notifications' ? 'notifications' : 'audit' }
      });
      setSystemLogs(res.data);
    } catch (err) {
      console.error('Failed to load system logs', err);
    } finally {
      setLogsLoading(false);
    }
  }

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await axios.put('/api/settings', settings);
      triggerToast('Company configurations saved successfully.');
    } catch (err) {
      console.error('Failed to save settings', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleExportBackup = () => {
    window.open(`${axios.defaults.baseURL || 'http://localhost:5000'}/api/settings/backup/export`, '_blank');
  };

  const handleRestoreBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setActionLoading(true);
        const parsed = JSON.parse(event.target?.result as string);
        await axios.post('/api/settings/backup/restore', { backupData: parsed });
        triggerToast('Database successfully restored from JSON backup. Refreshing page.');
        window.location.reload();
      } catch (err) {
        alert('Restore failed. Invalid JSON structure or DB constraints rejected import.');
      } finally {
        setActionLoading(false);
      }
    };
    reader.readAsText(file);
  };

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 4000);
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-muted rounded w-1/4"></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-96 bg-muted rounded-xl"></div>
          <div className="h-96 bg-muted rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in text-xs sm:text-sm relative">
      
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-slate-800 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 text-xs">
          <CheckCircle size={16} className="text-green-500 animate-bounce" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Title */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">System Settings</h1>
        <p className="text-xs text-muted-foreground font-medium">Configure company interest rates, manage backups, and review operator audit trails.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Settings Form */}
        <div className="lg:col-span-7 bg-card border border-border rounded-2xl p-6 shadow-sm">
          <form onSubmit={handleSettingsSubmit} className="space-y-6 text-xs">
            
            {/* General Configurations */}
            <div className="space-y-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground border-l-2 border-primary pl-2 flex items-center gap-2">
                <Sliders size={14} />
                <span>Base Financial Limits</span>
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-muted-foreground block mb-1">Company Name</label>
                  <input
                    type="text"
                    value={settings.companyName}
                    onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                    className="w-full bg-accent/40 border border-border rounded-xl py-2 px-3 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-muted-foreground block mb-1">Company Address</label>
                  <input
                    type="text"
                    value={settings.address}
                    onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                    className="w-full bg-accent/40 border border-border rounded-xl py-2 px-3 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-muted-foreground block mb-1">Base Interest Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={settings.baseInterestRate}
                    onChange={(e) => setSettings({ ...settings, baseInterestRate: parseFloat(e.target.value) })}
                    className="w-full bg-accent/40 border border-border rounded-xl py-2 px-3 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-muted-foreground block mb-1">Overdue Penalty Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={settings.basePenaltyRate}
                    onChange={(e) => setSettings({ ...settings, basePenaltyRate: parseFloat(e.target.value) })}
                    className="w-full bg-accent/40 border border-border rounded-xl py-2 px-3 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Email Configurations */}
            <div className="space-y-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground border-l-2 border-primary pl-2 flex items-center gap-2">
                <Mail size={14} />
                <span>SMTP Mail Server Configurations</span>
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-muted-foreground block mb-1">SMTP Host</label>
                  <input
                    type="text"
                    value={settings.smtpHost}
                    onChange={(e) => setSettings({ ...settings, smtpHost: e.target.value })}
                    className="w-full bg-accent/40 border border-border rounded-xl py-2 px-3 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-muted-foreground block mb-1">SMTP Port</label>
                  <input
                    type="number"
                    value={settings.smtpPort}
                    onChange={(e) => setSettings({ ...settings, smtpPort: parseInt(e.target.value, 10) })}
                    className="w-full bg-accent/40 border border-border rounded-xl py-2 px-3 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-muted-foreground block mb-1">SMTP Username</label>
                  <input
                    type="text"
                    placeholder="e.g. sandbox-id"
                    value={settings.smtpUser}
                    onChange={(e) => setSettings({ ...settings, smtpUser: e.target.value })}
                    className="w-full bg-accent/40 border border-border rounded-xl py-2 px-3 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-muted-foreground block mb-1">SMTP Password</label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={settings.smtpPass}
                    onChange={(e) => setSettings({ ...settings, smtpPass: e.target.value })}
                    className="w-full bg-accent/40 border border-border rounded-xl py-2 px-3 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-muted-foreground block mb-1">Sender Email Coordinates</label>
                <input
                  type="email"
                  value={settings.smtpFrom}
                  onChange={(e) => setSettings({ ...settings, smtpFrom: e.target.value })}
                  className="w-full bg-accent/40 border border-border rounded-xl py-2 px-3 focus:outline-none"
                />
              </div>
            </div>

            {/* Notification Integrations */}
            <div className="space-y-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground border-l-2 border-primary pl-2 flex items-center gap-2">
                <Smartphone size={14} />
                <span>WhatsApp Cloud API credentials</span>
              </h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="font-bold text-muted-foreground block mb-1">WhatsApp Cloud API Key</label>
                  <input
                    type="password"
                    placeholder="Enter WhatsApp Token for real notifications..."
                    value={settings.whatsappApiKey || ''}
                    onChange={(e) => setSettings({ ...settings, whatsappApiKey: e.target.value })}
                    className="w-full bg-accent/40 border border-border rounded-xl py-2.5 px-3 focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={actionLoading}
              className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-3 rounded-xl transition-colors shadow-lg flex items-center justify-center gap-2"
            >
              <Save size={16} />
              <span>{actionLoading ? 'Updating Configurations...' : 'Save Configuration Changes'}</span>
            </button>

          </form>
        </div>

        {/* Right Column: Backups and Logs */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Database Backup/Restore */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground border-l-2 border-primary pl-2 flex items-center gap-2">
              <Database size={14} />
              <span>Database Backups Utility</span>
            </h3>
            
            <p className="text-[10px] text-muted-foreground leading-normal">
              Generate a snapshot JSON container containing all users, active loans, chits, and logs. Snapshot files can be imported directly to restore database coordinates.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={handleExportBackup}
                className="bg-accent hover:bg-primary hover:text-white text-muted-foreground font-bold p-3 rounded-xl flex flex-col items-center justify-center gap-2 border border-border transition-all"
              >
                <FileDown size={20} />
                <span className="text-[10px]">Export DB Backup</span>
              </button>
              
              <label className="bg-accent hover:bg-primary hover:text-white text-muted-foreground font-bold p-3 rounded-xl flex flex-col items-center justify-center gap-2 border border-border transition-all cursor-pointer text-center">
                <FileUp size={20} />
                <span className="text-[10px]">Restore DB Backup</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleRestoreBackup}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* System Logs */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4 flex-1 flex flex-col justify-between">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground border-l-2 border-primary pl-2 flex items-center gap-2">
                <History size={14} />
                <span>System Audits & Alerts</span>
              </h3>
              
              {/* Tab selector */}
              <div className="flex gap-1.5 bg-accent p-0.5 rounded-lg text-[9px] font-bold">
                <button
                  onClick={() => setLogsTab('audit')}
                  className={`px-2 py-1 rounded ${logsTab === 'audit' ? 'bg-card text-foreground shadow' : 'text-muted-foreground'}`}
                >
                  Audits
                </button>
                <button
                  onClick={() => setLogsTab('notifications')}
                  className={`px-2 py-1 rounded ${logsTab === 'notifications' ? 'bg-card text-foreground shadow' : 'text-muted-foreground'}`}
                >
                  WhatsApp
                </button>
              </div>
            </div>

            {/* List */}
            {logsLoading ? (
              <div className="h-32 bg-muted animate-pulse rounded-lg"></div>
            ) : systemLogs.length === 0 ? (
              <p className="text-[10px] text-muted-foreground">No log history recorded.</p>
            ) : (
              <div className="max-h-72 overflow-y-auto space-y-3 pr-1 text-[10px]">
                {logsTab === 'audit' ? (
                  systemLogs.map((log) => (
                    <div key={log.id} className="border-b border-border/60 pb-2.5 last:border-b-0 space-y-1">
                      <div className="flex justify-between font-semibold text-foreground">
                        <span className="text-primary font-bold">{log.action}</span>
                        <span>{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-muted-foreground leading-normal">{log.details}</p>
                      {log.user && (
                        <span className="text-[8px] bg-accent px-1.5 py-0.5 rounded font-medium text-muted-foreground">Operator: {log.user.fullName} ({log.user.role})</span>
                      )}
                    </div>
                  ))
                ) : (
                  systemLogs.map((log) => (
                    <div key={log.id} className="border-b border-border/60 pb-2.5 last:border-b-0 space-y-1">
                      <div className="flex justify-between font-semibold">
                        <span className="text-foreground">{log.recipient}</span>
                        <span className={`px-1.5 rounded-[4px] text-[8px] font-bold ${
                          log.status === 'SENT' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                        }`}>
                          {log.status}
                        </span>
                      </div>
                      <p className="text-muted-foreground leading-normal">{log.content}</p>
                      <span className="text-[8px] text-muted-foreground/60">{new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
