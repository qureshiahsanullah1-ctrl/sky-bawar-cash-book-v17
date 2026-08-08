import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  UsersRound, 
  Building2, 
  DollarSign, 
  Container, 
  ChevronRight,
  CheckCircle2,
  X,
  FileSpreadsheet,
  Globe
} from 'lucide-react';
import { DUMMY_EXPORT_ACCOUNTS } from '../data/multiExportAccountsData';
import SkyArianaExportLedger from './SkyArianaExportLedger';

function formatUSD(val) {
  if (val === undefined || val === null || isNaN(val)) return '$0.00';
  const isNegative = val < 0;
  const absVal = Math.abs(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return isNegative ? `-$${absVal}` : `$${absVal}`;
}

export default function MultiAccountDashboard() {
  const [accounts, setAccounts] = useState(DUMMY_EXPORT_ACCOUNTS);
  const [activeAccountId, setActiveAccountId] = useState(DUMMY_EXPORT_ACCOUNTS[0]?.id || 'haji-ibrahim');
  const [searchTerm, setSearchTerm] = useState('');

  // New Client Modal state
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [newClientForm, setNewClientForm] = useState({
    clientName: '',
    clientNameDari: '',
    contactInfo: '',
    location: 'Kandahar, AF',
    licenseNo: '2401-2198'
  });

  // Selector: Filter accounts list by search term
  const filteredAccounts = useMemo(() => {
    if (!searchTerm.trim()) return accounts;
    const q = searchTerm.toLowerCase();
    return accounts.filter(acc => 
      acc.clientName.toLowerCase().includes(q) ||
      (acc.clientNameDari && acc.clientNameDari.includes(q)) ||
      (acc.location && acc.location.toLowerCase().includes(q))
    );
  }, [accounts, searchTerm]);

  // Selector: Derive active account data
  const activeAccountData = useMemo(() => {
    return accounts.find(acc => acc.id === activeAccountId) || accounts[0];
  }, [accounts, activeAccountId]);

  // Handle adding a new export client
  const handleAddClientSubmit = (e) => {
    e.preventDefault();
    if (!newClientForm.clientName.trim()) return;

    const newId = newClientForm.clientName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const newAccount = {
      id: newId,
      clientName: newClientForm.clientName.trim(),
      clientNameDari: newClientForm.clientNameDari.trim() || newClientForm.clientName.trim(),
      contactInfo: newClientForm.contactInfo.trim() || 'Customs Warehouse, AF',
      currency: 'USD',
      licenseNo: newClientForm.licenseNo || '2401-2198',
      location: newClientForm.location || 'Kandahar, AF',
      transactions: []
    };

    setAccounts(prev => [newAccount, ...prev]);
    setActiveAccountId(newId);
    setIsAddClientOpen(false);
    setNewClientForm({
      clientName: '',
      clientNameDari: '',
      contactInfo: '',
      location: 'Kandahar, AF',
      licenseNo: '2401-2198'
    });
  };

  return (
    <div 
      className="multi-account-dashboard -m-5 md:-m-6 h-[calc(100vh-64px)] w-[calc(100%+40px)] md:w-[calc(100%+48px)] flex flex-col bg-slate-100/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans no-print"
    >
      {/* TOP CORPORATE HEADER BAR (HIGH-DENSITY COMPACT) */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 px-3.5 py-1.5 flex flex-wrap items-center justify-between gap-2 shrink-0 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400">
            <FileSpreadsheet size={16} />
          </div>
          <div>
            <h1 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white tracking-tight uppercase flex items-center gap-2">
              <span>BOL Account Ledger</span>
            </h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-none">
              Manage company accounts, track ledger rows, and review BOL financial summaries.
            </p>
          </div>
        </div>

        {/* Quick Add Company Inline Bar */}
        <form onSubmit={handleAddClientSubmit} className="flex items-center gap-1.5">
          <input
            type="text"
            placeholder="Add company name..."
            value={newClientForm.clientName}
            onChange={(e) => setNewClientForm(prev => ({ ...prev, clientName: e.target.value }))}
            className="px-2.5 py-1 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 w-40 sm:w-56 transition-all"
          />
          <button
            type="submit"
            className="flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-2xs transition-all active:scale-[0.98]"
          >
            <Plus size={13} />
            <span>Add Company</span>
          </button>
        </form>
      </div>

      {/* TWO-COLUMN FULL HEIGHT WORKSPACE */}
      <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
        
        {/* 1. LEFT SIDEBAR: CLIENT ACCOUNTS LIST */}
        <aside className="w-full md:w-56 xl:w-64 bg-white/90 dark:bg-slate-900/90 border-r border-slate-200/80 dark:border-slate-800 flex flex-col shrink-0">
          
          {/* Sidebar Search Bar */}
          <div className="p-2 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/80">
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-7 pr-2.5 py-1 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-all"
              />
            </div>
          </div>

        {/* Scrollable Account Cards List */}
        <div className="flex-1 overflow-y-auto p-1.5 flex flex-col gap-1.5">
          {filteredAccounts.length === 0 ? (
            <div className="p-4 text-center text-slate-400 text-xs">
              No matching client ledgers found.
            </div>
          ) : (
            filteredAccounts.map((account) => {
              const isActive = account.id === activeAccountId;
              
              // Calculate Quick Metrics
              const txCount = account.transactions.length;
              let totalCred = 0;
              let totalDeb = 0;
              let containers = 0;
              account.transactions.forEach(t => {
                totalCred += (t.creditUSD || 0);
                totalDeb += (t.debitUSD || 0);
                containers += (t.quantity || 0);
              });
              const netBalance = totalCred - totalDeb;

              return (
                <button
                  key={account.id}
                  type="button"
                  onClick={() => setActiveAccountId(account.id)}
                  className={`w-full text-left p-2.5 rounded-xl transition-all duration-150 border flex flex-col gap-1 relative group ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-blue-600 shadow-sm ring-1 ring-blue-500/20'
                      : 'bg-white dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 border-slate-200/90 dark:border-slate-700/60 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/40 dark:hover:bg-slate-800 hover:shadow-2xs'
                  }`}
                >
                  <div className="flex items-start justify-between gap-1.5">
                    <div className="min-w-0 flex-1">
                      <strong className={`text-xs font-bold block truncate tracking-tight ${isActive ? 'text-white' : 'text-slate-900 dark:text-slate-100'}`}>
                        {account.clientName}
                      </strong>
                      <span className={`text-[11px] font-semibold block dir-rtl mt-0.5 ${isActive ? 'text-amber-200' : 'text-amber-600 dark:text-amber-400'}`}>
                        ({account.clientNameDari})
                      </span>
                    </div>
                    <ChevronRight size={14} className={`shrink-0 transition-transform ${isActive ? 'text-white translate-x-0.5' : 'text-slate-400 opacity-0 group-hover:opacity-100'}`} />
                  </div>

                  {/* Subtitle / Location */}
                  <div className={`text-[10px] truncate font-medium ${isActive ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>
                    {account.location || account.contactInfo}
                  </div>

                  {/* Badges Summary */}
                  <div className={`flex items-center justify-between pt-1 border-t text-[10px] ${isActive ? 'border-white/20' : 'border-slate-100 dark:border-slate-700/40'}`}>
                    <span className={`font-mono font-semibold ${isActive ? 'text-blue-100' : 'text-slate-500 dark:text-slate-400'}`}>
                      {txCount} Rows • {containers} Cnt
                    </span>
                    <strong className={`font-mono tabular-nums font-black text-[11px] ${
                      netBalance <= 0 
                        ? (isActive ? 'text-emerald-200' : 'text-emerald-600 dark:text-emerald-400') 
                        : (isActive ? 'text-rose-200' : 'text-rose-600 dark:text-rose-400')
                    }`}>
                      {formatUSD(netBalance)}
                    </strong>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* 2. RIGHT MAIN PANEL: ISOLATED CLIENT LEDGER VIEW */}
      <main className="flex-1 overflow-hidden flex flex-col min-w-0 bg-slate-100/50 dark:bg-slate-950">
        {activeAccountData ? (
          <SkyArianaExportLedger account={activeAccountData} />
        ) : (
          <div className="flex-1 flex items-center justify-center p-8 text-slate-400 text-sm">
            Select an export client account to view its ledger.
          </div>
        )}
      </main>

      {/* 3. NEW EXPORT CLIENT MODAL */}
      {isAddClientOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 no-print">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md p-5 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
                <Building2 size={18} className="text-blue-600" />
                <h3 className="text-sm font-black uppercase tracking-wider">New Export Client Ledger</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddClientOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddClientSubmit} className="flex flex-col gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Client / Company Name (English) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HUSSAIN-AYUBI LTD"
                  value={newClientForm.clientName}
                  onChange={(e) => setNewClientForm(prev => ({ ...prev, clientName: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1 dir-rtl">
                  نام مشتری / شرکت (دری/پښتو)
                </label>
                <input
                  type="text"
                  placeholder="e.g. شرکت تجارتی نجیب امین"
                  value={newClientForm.clientNameDari}
                  onChange={(e) => setNewClientForm(prev => ({ ...prev, clientNameDari: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 dir-rtl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Herat, AF"
                    value={newClientForm.location}
                    onChange={(e) => setNewClientForm(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                    License No.
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 2401-2198"
                    value={newClientForm.licenseNo}
                    onChange={(e) => setNewClientForm(prev => ({ ...prev, licenseNo: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Contact Info / Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. Kandahar Freight Center, AF | +93 799 123456"
                  value={newClientForm.contactInfo}
                  onChange={(e) => setNewClientForm(prev => ({ ...prev, contactInfo: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddClientOpen(false)}
                  className="px-3 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-sm transition-colors"
                >
                  Create Client Ledger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
