import { useState } from 'react';
import UserAccounts from '../components/UserAccounts';
import SystemDiagnostics from '../components/SystemDiagnostics';
import SettingsCompany from './SettingsCompany';
import BiometricAndUpdateSettings from '../components/BiometricAndUpdateSettings';
import { 
  BadgeCheck, Building2, Factory, Printer, ShieldCheck, Sliders, Users, 
  Activity, FileText, DollarSign, TrendingUp, SunMoon, Languages, Calendar, 
  Clock, Download, Upload, Trash2, Save, SlidersHorizontal, CheckCircle2 
} from 'lucide-react';

const METRIC_STYLES = {
  blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
};

export default function Settings(props) {
  const [activeTab, setActiveTab] = useState('all');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = async (e) => {
    e?.preventDefault();
    if (props.onSave) {
      await props.onSave();
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }
  };

  return (
    <div className="flex flex-col gap-5 sm:gap-6 w-full pb-12 transition-all">
      {/* 1. COMMAND CENTER HEADER */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm backdrop-blur-md">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 rounded-md border border-blue-200/60 dark:border-blue-800/60">
              Enterprise Configuration
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Company Branding & System Settings
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium max-w-2xl">
            Manage organization identity, secure user access, localization preferences, document output formats, and database backups for <span className="font-bold text-slate-700 dark:text-slate-200">{props.companyName || 'BAWAR STAR PLASTIC INDUSTRY'}</span>.
          </p>
        </div>

        <button 
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm shrink-0 active:scale-95" 
          onClick={props.onPrintPreview}
        >
          <Printer size={16} />
          <span>Open Print Preview Center</span>
        </button>
      </section>

      {/* 2. SETTINGS NAVIGATION TABS */}
      <nav className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 overflow-x-auto scrollbar-none">
        {[
          { id: 'all', label: 'All Settings', icon: Sliders },
          { id: 'company', label: 'Company Profile', icon: Building2 },
          { id: 'preferences', label: 'Preferences & Display', icon: SlidersHorizontal },
          { id: 'users', label: 'Users & Roles', icon: Users },
          { id: 'diagnostics', label: 'System Diagnostics', icon: Activity }
        ].map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 transition-all active:scale-95 shrink-0 ${
                isActive 
                  ? 'bg-blue-600 text-white shadow-sm' 
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
              }`}
            >
              <Icon size={15} />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

      {/* 3. METRICS OVERVIEW BAR */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {[
          { icon: Building2, title: 'Organization', value: props.companyName || 'BAWAR STAR PLASTIC INDUSTRY', color: 'blue' },
          { icon: Factory, title: 'Industry', value: 'Plastic Manufacturing', color: 'purple' },
          { icon: ShieldCheck, title: 'Active Administrator', value: props.currentUser?.full_name || 'System Administrator', color: 'emerald' },
          { icon: BadgeCheck, title: 'Print Header', value: props.printHeader ? 'Header Enabled' : 'Header Hidden', color: 'amber' }
        ].map(({ icon: Icon, title, value, color }) => (
          <div 
            className="p-3.5 sm:p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-sm backdrop-blur-md flex items-center gap-3.5" 
            key={title}
          >
            <div className={`p-2.5 rounded-xl border shrink-0 ${METRIC_STYLES[color]}`}>
              <Icon size={20} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block leading-none">
                {title}
              </span>
              <strong className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 truncate block mt-1">
                {value}
              </strong>
            </div>
          </div>
        ))}
      </div>

      {/* 4. COMPANY PROFILE SECTION */}
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

      {/* 5. PREFERENCES & BACKUP GRID */}
      {(activeTab === 'all' || activeTab === 'preferences') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
          {/* Preferences & Display */}
          <section className="lg:col-span-2 bg-white/80 dark:bg-slate-900/80 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-6 shadow-sm backdrop-blur-md flex flex-col justify-between">
            <div>
              <header className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    <SlidersHorizontal size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">Preferences & Display</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Configure currency, exchange rates, language, themes, and date display formats.</p>
                  </div>
                </div>
                {savedSuccess && (
                  <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 size={14} /> Saved!
                  </span>
                )}
              </header>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <DollarSign size={14} className="text-blue-500" />
                    <span>Default Currency</span>
                  </label>
                  <input 
                    type="text" 
                    className="w-full px-3.5 py-2.5 bg-slate-50/80 dark:bg-slate-950/80 border border-slate-200/90 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all" 
                    value={props.currencyCode || ''} 
                    onChange={(e) => props.setCurrencyCode(e.target.value)} 
                    placeholder="AFN or USD"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <TrendingUp size={14} className="text-blue-500" />
                    <span>Exchange Rate (AFN per USD)</span>
                  </label>
                  <input 
                    type="number" 
                    step="0.01" 
                    className="w-full px-3.5 py-2.5 bg-slate-50/80 dark:bg-slate-950/80 border border-slate-200/90 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all" 
                    value={props.exchangeRate || ''} 
                    onChange={(e) => props.setExchangeRate(e.target.value)} 
                    placeholder="64.30"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <SunMoon size={14} className="text-blue-500" />
                    <span>Theme Preference</span>
                  </label>
                  <select 
                    className="w-full px-3.5 py-2.5 bg-slate-50/80 dark:bg-slate-950/80 border border-slate-200/90 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all" 
                    value={props.theme || 'dark'} 
                    onChange={(e) => props.setTheme(e.target.value)}
                  >
                    <option value="dark">Dark Theme (Recommended)</option>
                    <option value="light">Light Theme</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Languages size={14} className="text-blue-500" />
                    <span>System Language</span>
                  </label>
                  <select 
                    className="w-full px-3.5 py-2.5 bg-slate-50/80 dark:bg-slate-950/80 border border-slate-200/90 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all" 
                    value={props.language || 'English'} 
                    onChange={(e) => props.setLanguage(e.target.value)}
                  >
                    <option value="English">English</option>
                    <option value="Pashto">Pashto (پښتو)</option>
                    <option value="Dari">Dari (دری)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Calendar size={14} className="text-blue-500" />
                    <span>Date Display Format</span>
                  </label>
                  <select 
                    className="w-full px-3.5 py-2.5 bg-slate-50/80 dark:bg-slate-950/80 border border-slate-200/90 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all" 
                    value={props.dateDisplayFormat || 'dual'} 
                    onChange={(e) => props.setDateDisplayFormat(e.target.value)}
                  >
                    <option value="dual">Persian Solar Hijri + Gregorian (Dual Date)</option>
                    <option value="persian">Persian Solar Hijri Only</option>
                    <option value="gregorian">Gregorian Only</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Printer size={14} className="text-blue-500" />
                    <span>Print Footer Text</span>
                  </label>
                  <input 
                    type="text" 
                    className="w-full px-3.5 py-2.5 bg-slate-50/80 dark:bg-slate-950/80 border border-slate-200/90 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all" 
                    value={props.printFooterText || ''} 
                    onChange={(e) => props.setPrintFooterText(e.target.value)} 
                    placeholder="Prepared by BAWAR STAR PLASTIC INDUSTRY" 
                    dir="auto" 
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <Clock size={14} className="text-blue-500" />
                    <span>Auto Logout Timeout (Minutes)</span>
                  </label>
                  <input 
                    type="number" 
                    min="1" 
                    className="w-full px-3.5 py-2.5 bg-slate-50/80 dark:bg-slate-950/80 border border-slate-200/90 dark:border-slate-800 rounded-xl text-xs font-semibold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none transition-all" 
                    value={props.autoLogoutMinutes || '30'} 
                    onChange={(e) => props.setAutoLogoutMinutes(e.target.value)} 
                  />
                </div>

                <div className="flex items-center gap-2.5 pt-4 sm:col-span-2">
                  <input 
                    type="checkbox" 
                    id="printHeaderCheck" 
                    className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 dark:bg-slate-950" 
                    checked={Boolean(props.printHeader)} 
                    onChange={(e) => props.setPrintHeader(e.target.checked)} 
                  />
                  <label htmlFor="printHeaderCheck" className="text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer select-none">
                    Include official company header logo & contact info on printed reports
                  </label>
                </div>
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
              <button 
                type="button" 
                className="w-full py-3 px-5 bg-blue-600 hover:bg-blue-700 active:scale-[0.99] text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2" 
                onClick={handleSave}
              >
                <Save size={16} />
                <span>Save All System Preferences</span>
              </button>
            </div>
          </section>

          {/* Backup & System Recovery */}
          <section className="bg-white/80 dark:bg-slate-900/80 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-6 shadow-sm backdrop-blur-md flex flex-col justify-between">
            <div>
              <header className="flex items-center gap-3 pb-4 mb-5 border-b border-slate-100 dark:border-slate-800">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  <Download size={20} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">Backup & Recovery</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Export system data or restore from snapshots.</p>
                </div>
              </header>

              <div className="flex flex-col gap-3">
                <button 
                  type="button" 
                  className="w-full py-3 px-4 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 active:scale-[0.99] text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2" 
                  onClick={props.onBackup}
                >
                  <Download size={15} />
                  <span>Export JSON Backup File</span>
                </button>

                <button 
                  type="button" 
                  className="w-full py-3 px-4 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 active:scale-[0.99] text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition-all border border-slate-200 dark:border-slate-700 flex items-center justify-center gap-2" 
                  onClick={props.onImportClick}
                >
                  <Upload size={15} />
                  <span>Import JSON Backup</span>
                </button>

                <button 
                  type="button" 
                  className="w-full py-3 px-4 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 active:scale-[0.99] text-rose-600 dark:text-rose-400 text-xs font-bold rounded-xl transition-all border border-rose-200 dark:border-rose-900/60 flex items-center justify-center gap-2" 
                  onClick={props.onClear}
                >
                  <Trash2 size={15} />
                  <span>Reset & Clear All System Data</span>
                </button>

                <input type="file" ref={props.fileRef} accept="application/json" hidden onChange={props.onImportFile} />

                {props.status && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 rounded-xl border border-blue-200 dark:border-blue-800/60 text-xs font-semibold">
                    {props.status}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 mt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium flex items-center gap-1.5">
                <Clock size={13} className="text-slate-400" />
                <span>Last System Backup:</span>
              </span>
              <strong className="font-semibold text-slate-800 dark:text-slate-200">
                {props.lastBackup || 'Never'}
              </strong>
            </div>
          </section>
        </div>
      )}

      {/* 6. BIOMETRIC & SECURITY SETTINGS */}
      {(activeTab === 'all' || activeTab === 'preferences') && (
        <BiometricAndUpdateSettings />
      )}

      {/* 7. SYSTEM DIAGNOSTICS */}
      {(activeTab === 'all' || activeTab === 'diagnostics') && (
        <SystemDiagnostics 
          diagnostics={props.diagnostics} 
          currentUser={props.currentUser} 
          onRefresh={props.onRefreshDiagnostics} 
        />
      )}
      
      {/* 8. USERS & ROLES */}
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

