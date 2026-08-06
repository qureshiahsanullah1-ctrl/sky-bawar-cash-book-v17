import { useState } from 'react';
import UserAccounts from '../components/UserAccounts';
import SystemDiagnostics from '../components/SystemDiagnostics';
import SettingsCompany from './SettingsCompany';
import BiometricAndUpdateSettings from '../components/BiometricAndUpdateSettings';
import { BadgeCheck, Building2, Factory, Printer, ShieldCheck, Sliders, Users, Activity, FileText } from 'lucide-react';

export default function Settings(props) {
  const [activeTab, setActiveTab] = useState('all');

  return (
    <div className="settings-page flex flex-col gap-3 p-1 font-sans" style={{ zoom: 0.88 }}>
      {/* 1. COMPACT COMMAND CENTER HEADER */}
      <section className="settings-command-center glass-card flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="settings-command-copy min-w-0">
          <p className="eyebrow text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400">Enterprise Settings</p>
          <h2 className="text-base font-black tracking-tight text-slate-900 dark:text-slate-100 uppercase">Company Branding & System Configuration</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Manage identity, secure preferences, user access, and document output for {props.companyName || 'BAWAR STAR PLASTIC INDUSTRY'}.</p>
        </div>
        <button className="primary-btn icon-text-btn shrink-0 text-xs font-bold py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm flex items-center gap-2" onClick={props.onPrintPreview}>
          <Printer size={16} />
          <span>Open Print Preview Center</span>
        </button>
      </section>

      {/* 2. SETTINGS NAVIGATION TABS */}
      <div className="settings-tab-bar flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 overflow-x-auto scrollbar-none">
        {[
          { id: 'all', label: 'All Settings', icon: Sliders },
          { id: 'users', label: 'Users & Security Roles', icon: Users },
          { id: 'company', label: 'Company Profile & Branding', icon: Building2 },
          { id: 'preferences', label: 'Preferences & Backup', icon: FileText },
          { id: 'diagnostics', label: 'System Diagnostics', icon: Activity }
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all active:scale-95 shrink-0 ${activeTab === id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'}`}
          >
            <Icon size={14} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* 3. STREAMLINED 4-CARD METRICS BAR */}
      <div className="settings-overview-grid grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {[
          { icon: Building2, title: 'Company', value: props.companyName || 'BAWAR STAR PLASTIC INDUSTRY', color: 'blue' },
          { icon: Factory, title: 'Industry', value: 'Plastic Manufacturing', color: 'violet' },
          { icon: ShieldCheck, title: 'Administrator', value: props.currentUser?.full_name || 'System User', color: 'emerald' },
          { icon: BadgeCheck, title: 'Print Status', value: props.printHeader ? 'Header Enabled' : 'Header Hidden', color: 'amber' }
        ].map(({ icon: Icon, title, value, color }) => (
          <div className="settings-overview-card glass-card p-3 rounded-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/80 dark:border-slate-800 flex items-center gap-3" key={title}>
            <div className={`metric-icon p-2 rounded-lg bg-${color}-500/10 text-${color}-600 dark:text-${color}-400 shrink-0`}>
              <Icon size={18} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block leading-tight">{title}</span>
              <strong className="text-xs font-black text-slate-900 dark:text-slate-100 truncate block mt-0.5">{value}</strong>
            </div>
          </div>
        ))}
      </div>

      {/* 3. SIDE-BY-SIDE BRANDING & PREFERENCES GRID */}
      {(activeTab === 'all' || activeTab === 'company') && (
        <SettingsCompany
          companyName={props.companyName}
          setCompanyName={props.setCompanyName}
          companyLogo={props.companyLogo}
          setCompanyLogo={props.setCompanyLogo}
          companyAddress={props.companyAddress}
          setCompanyAddress={props.setCompanyAddress}
          companyPhone={props.companyPhone}
          setCompanyPhone={props.setCompanyPhone}
          companyEmail={props.companyEmail}
          setCompanyEmail={props.setCompanyEmail}
          companyWebsite={props.companyWebsite}
          setCompanyWebsite={props.setCompanyWebsite}
          companyTaxNumber={props.companyTaxNumber}
          setCompanyTaxNumber={props.setCompanyTaxNumber}
          companyLicense={props.companyLicense}
          setCompanyLicense={props.setCompanyLicense}
          onStatus={props.setSettingsStatus}
        />
      )}

      {(activeTab === 'all' || activeTab === 'preferences') && (
        <div className="entry-grid grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="glass-card form-card p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800">
            <div className="card-header pb-2 mb-3 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">Preferences & Display</h3>
            </div>
            <div className="settings-form grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Default Currency
                <input className="form-control text-xs mt-1" type="text" value={props.currencyCode} onChange={(e) => props.setCurrencyCode(e.target.value)} />
              </label>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Exchange Rate
                <input className="form-control text-xs mt-1" type="number" value={props.exchangeRate} onChange={(e) => props.setExchangeRate(e.target.value)} step="0.01" />
              </label>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Theme
                <select className="form-select text-xs mt-1" value={props.theme} onChange={(e) => props.setTheme(e.target.value)}><option value="dark">Dark</option><option value="light">Light</option></select>
              </label>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Language
                <select className="form-select text-xs mt-1" value={props.language} onChange={(e) => props.setLanguage(e.target.value)}><option value="English">English</option><option value="Pashto">Pashto</option><option value="Dari">Dari</option></select>
              </label>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 sm:col-span-2">Date Display Format
                <select className="form-select text-xs mt-1" value={props.dateDisplayFormat} onChange={(e) => props.setDateDisplayFormat(e.target.value)}><option value="dual">Persian + Gregorian (Dual Date)</option><option value="persian">Persian Only</option><option value="gregorian">Gregorian Only</option></select>
              </label>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 sm:col-span-2">Print Footer Text
                <input className="form-control text-xs mt-1" type="text" value={props.printFooterText} onChange={(e) => props.setPrintFooterText(e.target.value)} dir="auto" />
              </label>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Auto Logout (Mins)
                <input className="form-control text-xs mt-1" type="number" min="1" value={props.autoLogoutMinutes} onChange={(e) => props.setAutoLogoutMinutes(e.target.value)} />
              </label>
              <label className="checkbox-row flex items-center gap-2 mt-5 sm:col-span-2">
                <input type="checkbox" checked={props.printHeader} onChange={(e) => props.setPrintHeader(e.target.checked)} />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Show company header in print</span>
              </label>
              <button className="primary-btn full-width sm:col-span-2 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl mt-2" onClick={props.onSave}>Save Settings</button>
            </div>
          </div>

          <div className="glass-card form-card p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between">
            <div>
              <div className="card-header pb-2 mb-3 border-b border-slate-200 dark:border-slate-800">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">Backup & System Recovery</h3>
              </div>
              <div className="backup-actions flex flex-col gap-2.5">
                <button className="primary-btn full-width py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl" onClick={props.onBackup}>Export JSON Backup</button>
                <button className="ghost-btn full-width py-2 text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl" onClick={props.onImportClick}>Import Backup</button>
                <button className="danger-btn full-width py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl" onClick={props.onClear}>Clear All Data</button>
              </div>
              <input type="file" ref={props.fileRef} accept="application/json" hidden onChange={props.onImportFile} />
              {props.status && <div className="backup-status text-xs font-semibold text-blue-600 mt-2">{props.status}</div>}
            </div>
            <p className="muted text-xs text-slate-500 mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-800">Last backup: {props.lastBackup || 'Never'}</p>
          </div>
        </div>
      )}

      {(activeTab === 'all' || activeTab === 'preferences') && <BiometricAndUpdateSettings />}

      {(activeTab === 'all' || activeTab === 'diagnostics') && (
        <SystemDiagnostics diagnostics={props.diagnostics} currentUser={props.currentUser} onRefresh={props.onRefreshDiagnostics} />
      )}
      
      {(activeTab === 'all' || activeTab === 'users') && (
        <UserAccounts
          currentUser={props.currentUser}
          users={props.users || []}
          onReload={props.onReloadUsers}
          onCreate={props.onCreateUser}
          onUpdate={props.onUpdateUser}
          onDelete={props.onDeleteUser}
          onResetPassword={props.onResetUserPassword}
        />
      )}
    </div>
  );
}
