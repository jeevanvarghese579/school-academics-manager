import { useEffect, useRef, useState } from 'react';
import { Settings as SettingsIcon, GraduationCap, Palette, Database, Info, ExternalLink, Save, Trash2, Download, Upload, LogOut } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/context/ThemeContext';
import { useToast } from '@/components/ui/Toast';
import { Modal } from '@/components/ui/Modal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type { UserSettings, ClassRoom } from '@/types';
import { downloadFile } from '@/utils/csv';

const APP_VERSION = '1.0.2';

export function Settings() {
  const { repo, mode, signOut, exitOfflineMode } = useApp();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [classes, setClasses] = useState<ClassRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearOpen, setClearOpen] = useState(false);
  const [exitOfflineOpen, setExitOfflineOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    if (!repo) return;
    try {
      const [setts, cls] = await Promise.all([repo.getSettings(), repo.getClasses()]);
      setSettings(setts);
      setClasses(cls);
      if (setts) setTheme(setts.theme);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [repo]);

  const update = (patch: Partial<UserSettings>) => {
    if (!settings) return;
    setSettings({ ...settings, ...patch });
  };

  const handleSave = async () => {
    if (!repo || !settings) return;
    try {
      await repo.saveSettings(settings);
      setTheme(settings.theme);
      toast('Settings saved', 'success');
    } catch (err: any) { toast(err.message || 'Failed to save', 'error'); }
  };

  const handleExportBackup = async () => {
    if (!repo) return;
    try {
      const data = await repo.exportBackup();
      downloadFile(JSON.stringify(data, null, 2), 'sam_backup.json', 'application/json');
      toast('Backup exported', 'success');
    } catch (err: any) { toast(err.message || 'Failed to export', 'error'); }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!repo) return;
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.version || !data.classes) { toast('Invalid backup file', 'error'); return; }
      await repo.importBackup(data);
      toast('Backup restored', 'success');
      await load();
    } catch (err: any) { toast(err.message || 'Failed to restore', 'error'); }
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleClear = async () => {
    if (!repo) return;
    try { await repo.clearAllData(); toast('All data cleared', 'success'); await load(); }
    catch (err: any) { toast(err.message || 'Failed to clear', 'error'); }
  };

  if (loading) return <div className="space-y-4"><div className="skeleton h-8 w-32" /><div className="skeleton h-64" /></div>;
  if (!settings) return null;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <button onClick={handleSave} className="btn-primary"><Save className="w-4 h-4" /> Save Settings</button>
      </div>

      {/* General */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4"><SettingsIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" /><h2 className="font-semibold text-gray-900 dark:text-white">General</h2></div>
        <div className="space-y-4">
          <div>
            <label className="label">Default Academic Year</label>
            <input className="input" value={settings.defaultAcademicYear} onChange={(e) => update({ defaultAcademicYear: e.target.value })} placeholder="e.g. 2026–27" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Percentage Decimal Places</label>
              <input type="number" className="input" value={settings.decimalPlaces} onChange={(e) => update({ decimalPlaces: parseInt(e.target.value) || 0 })} min="0" max="5" />
            </div>
            <div>
              <label className="label">Default Class</label>
              <select className="input" value={settings.defaultClassId || ''} onChange={(e) => update({ defaultClassId: e.target.value || null })}>
                <option value="">None</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name} {c.division}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Percentage Required for Double Pass</label>
            <input type="number" className="input" value={settings.doublePassRequiredPercent} onChange={(e) => update({ doublePassRequiredPercent: parseFloat(e.target.value) || 0 })} min="0" max="100" />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Enable Ranking in Reports</label>
            <button onClick={() => update({ rankingEnabled: !settings.rankingEnabled })} className={`relative w-11 h-6 rounded-full transition-colors ${settings.rankingEnabled ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-700'}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${settings.rankingEnabled ? 'translate-x-5' : ''}`} />
            </button>
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Allow Marks Over Maximum</label>
            <button onClick={() => update({ allowMarksOverMax: !settings.allowMarksOverMax })} className={`relative w-11 h-6 rounded-full transition-colors ${settings.allowMarksOverMax ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-700'}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${settings.allowMarksOverMax ? 'translate-x-5' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Plus One */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4"><GraduationCap className="w-5 h-5 text-accent-600 dark:text-accent-400" /><h2 className="font-semibold text-gray-900 dark:text-white">Plus One Examination</h2></div>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Max TE Marks</label>
              <input type="number" className="input" value={settings.plusOneMaxTE} onChange={(e) => update({ plusOneMaxTE: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="label">Max CE Marks</label>
              <input type="number" className="input" value={settings.plusOneMaxCE} onChange={(e) => update({ plusOneMaxCE: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="label">Max Total</label>
              <input type="number" className="input" value={settings.plusOneMaxTotal} onChange={(e) => update({ plusOneMaxTotal: parseFloat(e.target.value) || 0 })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Required TE %</label>
              <input type="number" className="input" value={settings.requiredTEPercent} onChange={(e) => update({ requiredTEPercent: parseFloat(e.target.value) || 0 })} min="0" max="100" />
            </div>
            <div>
              <label className="label">Required Total %</label>
              <input type="number" className="input" value={settings.requiredTotalPercent} onChange={(e) => update({ requiredTotalPercent: parseFloat(e.target.value) || 0 })} min="0" max="100" />
            </div>
          </div>
          <div>
            <label className="label">A+ Threshold (%)</label>
            <input type="number" className="input" value={settings.aPlusThreshold} onChange={(e) => update({ aPlusThreshold: parseFloat(e.target.value) || 0 })} min="0" max="100" />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Enable Double Pass Calculation</label>
            <button onClick={() => update({ doublePassEnabled: !settings.doublePassEnabled })} className={`relative w-11 h-6 rounded-full transition-colors ${settings.doublePassEnabled ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-700'}`}>
              <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${settings.doublePassEnabled ? 'translate-x-5' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Appearance */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4"><Palette className="w-5 h-5 text-primary-600 dark:text-primary-400" /><h2 className="font-semibold text-gray-900 dark:text-white">Appearance</h2></div>
        <div className="grid grid-cols-3 gap-3">
          {(['system', 'light', 'dark'] as const).map((t) => (
            <button key={t} onClick={() => { setTheme(t); update({ theme: t }); }} className={`btn ${theme === t ? 'btn-primary' : 'btn-secondary'} capitalize`}>{t}</button>
          ))}
        </div>
      </div>

      {/* Data */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4"><Database className="w-5 h-5 text-primary-600 dark:text-primary-400" /><h2 className="font-semibold text-gray-900 dark:text-white">Data Management</h2></div>
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-2">
            <span className={`w-2.5 h-2.5 rounded-full ${mode === 'online' ? 'bg-primary-500' : 'bg-amber-500'}`} />
            {mode === 'online' ? 'Online Mode — Cloud Synced' : 'Offline Mode — This Device Only'}
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={handleExportBackup} className="btn-secondary"><Download className="w-4 h-4" /> Export Backup</button>
            {mode === 'offline' && (
              <>
                <button onClick={() => fileRef.current?.click()} className="btn-secondary"><Upload className="w-4 h-4" /> Import Backup</button>
                <input ref={fileRef} type="file" accept=".json" onChange={handleImportBackup} className="hidden" />
                <button onClick={() => setClearOpen(true)} className="btn-danger"><Trash2 className="w-4 h-4" /> Clear All Data</button>
                <button onClick={() => setExitOfflineOpen(true)} className="btn-secondary"><LogOut className="w-4 h-4" /> Exit Offline Mode</button>
              </>
            )}
            {mode === 'online' && (
              <button onClick={signOut} className="btn-secondary"><LogOut className="w-4 h-4" /> Sign Out</button>
            )}
          </div>
        </div>
      </div>

      {/* About */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4"><Info className="w-5 h-5 text-primary-600 dark:text-primary-400" /><h2 className="font-semibold text-gray-900 dark:text-white">About SAM</h2></div>
        <div className="space-y-2 text-sm">
          <p className="font-medium text-gray-900 dark:text-white">Students Academics Manager</p>
          <p className="text-gray-500 dark:text-gray-400">Developed by Jeevan Varghese</p>
          <p className="text-gray-400 dark:text-gray-500">Version {APP_VERSION} · {mode === 'online' ? 'Online Mode' : 'Offline Mode'}</p>
          <a href="https://itsjeevanvarghese.web.app" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary-600 dark:text-primary-400 hover:underline mt-2">
            More software by Jeevan Varghese <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button onClick={() => setAboutOpen(true)} className="btn-ghost text-sm mt-2">PWA / Install Info</button>
        </div>
      </div>

      <ConfirmDialog open={clearOpen} onClose={() => setClearOpen(false)} onConfirm={handleClear}
        title="Clear All Data" message="This will permanently delete ALL classes, students, exams, marks, assignments, and grace marks from this device. This cannot be undone."
        confirmLabel="Delete Everything" danger strong
      />
      <ConfirmDialog open={exitOfflineOpen} onClose={() => setExitOfflineOpen(false)} onConfirm={exitOfflineMode}
        title="Exit Offline Mode?" message="Your offline data will remain stored on this device. It will not be deleted or uploaded."
        confirmLabel="Exit Offline Mode"
      />

      <Modal open={aboutOpen} onClose={() => setAboutOpen(false)} title="About PWA Installation">
        <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
          <p>SAM is a Progressive Web App (PWA). You can install it on your device for offline use:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>Desktop:</strong> Click the install icon in the address bar, or use the browser menu → "Install SAM".</li>
            <li><strong>Android:</strong> Open in Chrome, tap the menu → "Add to Home screen".</li>
            <li><strong>iOS:</strong> Open in Safari, tap Share → "Add to Home Screen".</li>
          </ul>
          <p>Once installed, SAM works offline without an internet connection. In Offline Mode, all data is stored locally on your device and never uploaded.</p>
          <p>Online Mode syncs your data to the cloud, tied to your account. The two databases are always kept separate.</p>
        </div>
      </Modal>
    </div>
  );
}
