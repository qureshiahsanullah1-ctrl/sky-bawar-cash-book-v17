import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ChevronRight,
  Search,
  Plus,
  Filter,
  Users,
  Printer,
  Download,
  TrendingUp,
  TrendingDown,
  Wallet,
  Scale,
  X,
  Building2,
  User,
  RotateCcw,
  Sparkles,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  Factory
} from 'lucide-react';
import LedgerTable from '../components/LedgerTable';

function unescapeText(str) {
  if (!str || typeof str !== 'string') return String(str ?? '');
  let text = str;
  while (text.includes('&amp;')) {
    text = text.replace(/&amp;/g, '&');
  }
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
}

function isBawarAccountName(name) {
  if (!name || typeof name !== 'string') return false;
  const s = name.toLowerCase();
  return s.includes('bawar') || s.includes('factory') || s.includes('plastic') || s.includes('preform') || s.includes('foctory') || s.includes('rent');
}

export default function AccountLedger(props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const ledgerRightPanelRef = useRef(null);
  const visibleAccounts = props.accounts || [];

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState('all');
  const [accountTypeFilter, setAccountTypeFilter] = useState('all');

  const bawarAccountsCount = useMemo(() => {
    return visibleAccounts.filter((a) => isBawarAccountName(a.name)).length;
  }, [visibleAccounts]);

  // Filter accounts based on account type tab filter
  const filteredAccounts = useMemo(() => {
    let list = visibleAccounts;
    if (accountTypeFilter === 'receivable') {
      list = list.filter((a) => Number(a.balance || a.opening_balance_afn || 0) < 0);
    } else if (accountTypeFilter === 'payable') {
      list = list.filter((a) => Number(a.balance || a.opening_balance_afn || 0) > 0);
    } else if (accountTypeFilter === 'bawar') {
      list = list.filter((a) => isBawarAccountName(a.name));
    }
    return list;
  }, [visibleAccounts, accountTypeFilter]);

  // Filter rows based on date range & currency
  const filteredRows = useMemo(() => {
    let list = props.rows || [];
    if (fromDate) {
      list = list.filter((r) => r.isOpeningBalance || (r.date && r.date >= fromDate));
    }
    if (toDate) {
      list = list.filter((r) => r.isOpeningBalance || (r.date && r.date <= toDate));
    }
    if (currencyFilter === 'afn') {
      list = list.filter((r) => r.isOpeningBalance || (r.cash_in_afn > 0 || r.cash_out_afn > 0));
    } else if (currencyFilter === 'usd') {
      list = list.filter((r) => r.isOpeningBalance || (r.usd_in > 0 || r.usd_out > 0));
    }
    return list;
  }, [props.rows, fromDate, toDate, currencyFilter]);

  const hasFilters = Boolean(fromDate || toDate || currencyFilter !== 'all');

  const handleResetFilters = () => {
    setFromDate('');
    setToDate('');
    setCurrencyFilter('all');
  };

  const selectedAccountCleanName = useMemo(() => {
    return unescapeText(props.selectedAccountName || '');
  }, [props.selectedAccountName]);

  return (
    <div className="account-ledger-page min-h-[calc(100vh-100px)] flex flex-col gap-5 p-3 sm:p-6 bg-slate-50/50 dark:bg-slate-950/50 transition-colors">
      {/* 1. PAGE HEADER */}
      <header className="account-ledger-header bg-white/90 dark:bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span>{t('accountLedger.title', 'Account Ledger')}</span>
            </h2>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shadow-xs">
              {visibleAccounts.length} {visibleAccounts.length === 1 ? t('accountLedger.account', 'Account') : t('accountLedger.accounts', 'Accounts')}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            {t('accountLedger.description', 'Manage customer, vendor, and company account statements and running financial balances')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-md shadow-amber-500/25 transition-all flex items-center gap-2 transform active:scale-95"
            onClick={() => setShowCreateForm(true)}
          >
            <Plus size={16} />
            <span>{t('accountLedger.newAccount', 'New Account')}</span>
          </button>

          <button
            type="button"
            className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs transition-all flex items-center gap-2 transform active:scale-95"
            onClick={props.onPrint}
          >
            <Printer size={15} />
            <span>{t('accountLedger.printLedger', 'Print Ledger')}</span>
          </button>

          <button
            type="button"
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/25 transition-all flex items-center gap-2 transform active:scale-95"
            onClick={props.onExport}
          >
            <Download size={15} />
            <span>{t('accountLedger.exportLedger', 'Export Ledger')}</span>
          </button>

          <button
            type="button"
            className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-600/25 transition-all flex items-center gap-2 transform active:scale-95 border border-blue-400/30"
            onClick={() => navigate('/bawar-star')}
            title="Open Bawar Star Manufacturing Module"
          >
            <Factory size={15} />
            <span>{t('accountLedger.bawarStarModuleBtn', 'Bawar Star Module 🏭')}</span>
          </button>
        </div>
      </header>

      {/* CREATE NEW ACCOUNT MODAL */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <Plus size={18} className="text-amber-500" />
                <span>{t('accountLedger.createNewAccount', 'Create New Account')}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form
              className="space-y-4"
              onSubmit={(e) => {
                props.onCreateAccount(e);
                setShowCreateForm(false);
              }}
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t('accountLedger.accountNameLabel', 'Account / Company Name *')}
                </label>
                <input
                  type="text"
                  value={props.accountName}
                  onChange={(e) => props.setAccountName(e.target.value)}
                  placeholder="e.g. Ahmad Shah Trading"
                  required
                  dir="auto"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-600 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  {t('accountLedger.openingBalanceLabel', 'Opening Balance (AFN)')}
                </label>
                <input
                  type="number"
                  value={props.openingBalance}
                  onChange={(e) => props.setOpeningBalance(e.target.value)}
                  placeholder="0.00"
                  step="0.01"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-600 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/25 focus:border-amber-500 font-mono font-bold"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  {t('accountLedger.balanceHint', 'Positive balance = Credit / Deposit, Negative = Debit / Owed.')}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  {t('accountLedger.cancel', 'Cancel')}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-md shadow-amber-500/20 transition-all"
                >
                  {t('accountLedger.saveAccount', 'Save Account')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MOBILE SWIPEABLE ACCOUNT PICKER CAROUSEL (Visible on mobile screens) */}
      <div className="block md:hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-2">
        <div className="flex items-center justify-between text-xs px-1">
          <span className="font-extrabold text-slate-700 dark:text-slate-200 uppercase tracking-wider text-[10px]">{t('accountLedger.quickSwitch', 'Quick Switch Account')}</span>
          <span className="text-[10px] font-bold text-amber-500">{visibleAccounts.length} {t('accountLedger.total', 'Total')}</span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 text-xs">
          {visibleAccounts.map((acct) => {
            const isActive = acct.name === props.selectedAccountName;
            const cleanName = unescapeText(acct.name);
            const bal = Number(acct.balance || acct.opening_balance_afn || 0);
            return (
              <button
                key={`mob-acct-${acct.id}`}
                type="button"
                onClick={() => props.onSelectAccount(acct)}
                className={`px-3 py-2 rounded-xl shrink-0 transition-all flex items-center gap-2 border text-left active:scale-95 ${
                  isActive
                    ? 'bg-amber-500 text-white font-extrabold border-amber-500 shadow-md shadow-amber-500/25'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 font-semibold'
                }`}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                  isActive ? 'bg-white text-amber-600' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                }`}>
                  {cleanName.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <span className="block truncate max-w-[100px] text-xs leading-tight">{cleanName}</span>
                  <span className={`block text-[9px] font-mono font-bold ${isActive ? 'text-amber-100' : bal >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    {t('accountLedger.afn', 'AFN')} {bal.toLocaleString('en-US')}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. TWO-COLUMN RESPONSIVE LAYOUT (SIDE-BY-SIDE FROM MD UPWARDS) */}
      <div className="account-ledger-layout flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Accounts Sidebar (Sticky on md screens, minimum 420px height when stacked) */}
        <aside className="ledger-left-panel md:col-span-5 lg:col-span-4 xl:col-span-3 md:sticky md:top-20 md:max-h-[calc(100vh-130px)] flex flex-col min-h-[420px] max-h-[600px] md:min-h-0">
          
          {/* Search + Accounts List Card */}
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm flex flex-col h-full">
            {/* Header & Search */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-900/80 space-y-3">
              <div className="relative flex items-center">
                <Search className="absolute left-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="search"
                  value={props.search}
                  onChange={(e) => props.setSearch(e.target.value)}
                  placeholder={t('accountLedger.searchPlaceholder', 'Search accounts...')}
                  className="w-full pl-10 pr-8 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium shadow-inner"
                />
                {props.search && (
                  <button
                    type="button"
                    onClick={() => props.setSearch('')}
                    className="absolute right-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              {/* Account Quick Filter Tabs */}
              <div className="flex items-center gap-1 bg-slate-200/70 dark:bg-slate-800/90 p-1 rounded-xl text-[11px] font-bold overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => setAccountTypeFilter('all')}
                  className={`flex-1 py-1.5 px-2 rounded-lg transition-all text-center whitespace-nowrap ${
                    accountTypeFilter === 'all'
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-extrabold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {t('accountLedger.all', 'All')} ({visibleAccounts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setAccountTypeFilter('receivable')}
                  className={`flex-1 py-1.5 px-2 rounded-lg transition-all text-center whitespace-nowrap ${
                    accountTypeFilter === 'receivable'
                      ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-xs font-extrabold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {t('accountLedger.debits', 'Debits')}
                </button>
                <button
                  type="button"
                  onClick={() => setAccountTypeFilter('payable')}
                  className={`flex-1 py-1.5 px-2 rounded-lg transition-all text-center whitespace-nowrap ${
                    accountTypeFilter === 'payable'
                      ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs font-extrabold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {t('accountLedger.credits', 'Credits')}
                </button>
                <button
                  type="button"
                  onClick={() => setAccountTypeFilter('bawar')}
                  className={`flex-1 py-1.5 px-2 rounded-lg transition-all text-center whitespace-nowrap flex items-center justify-center gap-1 ${
                    accountTypeFilter === 'bawar'
                      ? 'bg-blue-600 text-white shadow-xs font-extrabold'
                      : 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/40'
                  }`}
                >
                  <Factory size={11} />
                  <span>{t('accountLedger.bawarStarTab', 'Factory')}</span>
                  {bawarAccountsCount > 0 && (
                    <span className={`text-[9px] px-1 rounded-full font-black ${accountTypeFilter === 'bawar' ? 'bg-white text-blue-700' : 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300'}`}>
                      {bawarAccountsCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Account List */}
            <div className="overflow-y-auto p-2.5 space-y-1.5 divide-y divide-slate-100/60 dark:divide-slate-800/40 flex-1 min-h-[300px]">
              {!filteredAccounts.length ? (
                <div className="py-16 px-4 text-center text-slate-400 space-y-2">
                  <Users className="w-10 h-10 mx-auto opacity-30" />
                  <p className="text-xs font-semibold">{t('accountLedger.noAccountsFound', 'No accounts found')}</p>
                </div>
              ) : (
                filteredAccounts.map((account) => {
                  const isActive = account.name === props.selectedAccountName;
                  const cleanName = unescapeText(account.name);
                  const bal = Number(account.balance || account.opening_balance_afn || 0);
                  const isNegative = bal < 0;
                  const isBawar = isBawarAccountName(account.name);

                  return (
                    <button
                      key={account.id}
                      type="button"
                      onClick={() => {
                        props.onSelectAccount(account);
                        if (ledgerRightPanelRef.current && window.innerWidth < 1024) {
                          ledgerRightPanelRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                      }}
                      className={`w-full p-3.5 text-left rounded-xl transition-all flex items-center justify-between gap-3 ${
                        isActive
                          ? 'bg-amber-500/10 dark:bg-amber-500/15 border-l-4 border-amber-500 text-amber-950 dark:text-amber-200 shadow-xs'
                          : 'bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-800 dark:text-slate-200'
                      }`}
                    >
                      {/* Avatar Circle */}
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-extrabold text-xs shrink-0 shadow-xs ${
                        isActive
                          ? 'bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-amber-500/30 shadow-md'
                          : isBawar
                          ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60'
                      }`}>
                        {cleanName.slice(0, 1).toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1.5">
                          <strong className={`text-sm font-bold truncate block ${isActive ? 'text-amber-900 dark:text-amber-200 font-extrabold' : 'text-slate-900 dark:text-slate-100'}`}>
                            {cleanName}
                          </strong>
                          <div className="flex items-center gap-1 shrink-0">
                            {isBawar && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-[9px] font-bold border border-blue-500/20">
                                <Factory size={9} />
                                <span>Bawar Star</span>
                              </span>
                            )}
                            <span className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-extrabold ${
                              isNegative ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400' : bal > 0 ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                            }`}>
                              {isNegative ? t('accountLedger.debitBadge', 'Debit') : bal > 0 ? t('accountLedger.creditBadge', 'Credit') : t('accountLedger.zeroBadge', 'Zero')}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-1 text-[11px] font-mono">
                          <span className="text-slate-400 dark:text-slate-500 text-[10px] uppercase font-sans font-semibold">{t('accountLedger.balance', 'Balance')}</span>
                          <span className={`font-extrabold tracking-tight ${isNegative ? 'text-amber-600 dark:text-amber-400' : bal > 0 ? 'text-emerald-600 dark:text-emerald-400 font-black' : 'text-slate-500'}`}>
                            {t('accountLedger.afn', 'AFN')} {bal.toLocaleString('en-US')}
                          </span>
                        </div>
                      </div>

                      <ChevronRight size={16} className={`shrink-0 transition-transform ${isActive ? 'text-amber-500 translate-x-0.5 font-bold' : 'text-slate-400 opacity-50'}`} />
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </aside>

        {/* RIGHT COLUMN: Ledger Details & Table */}
        <main ref={ledgerRightPanelRef} className="ledger-right-panel md:col-span-7 lg:col-span-8 xl:col-span-9 flex flex-col min-w-0">
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm flex flex-col">
            
            {/* BAWAR STAR SPECIAL MANUFACTURING BANNER */}
            {isBawarAccountName(props.selectedAccountName) && (
              <div className="p-4 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 border-b border-blue-500/40 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md relative overflow-hidden">
                <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />
                <div className="flex items-center gap-3.5 relative z-10">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-md border border-blue-400/30 shrink-0">
                    <Factory className="w-5.5 h-5.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-blue-500/20 border border-blue-400/30 text-blue-300 text-[10px] font-bold uppercase tracking-wider">
                        {t('accountLedger.bawarStarBadge', 'Bawar Star Factory Partner')}
                      </span>
                    </div>
                    <h4 className="text-sm sm:text-base font-black text-white mt-0.5">
                      {t('accountLedger.bawarStarBannerTitle', 'Bawar Star Plastic Industry Partner Statement')}
                    </h4>
                    <p className="text-[11px] text-slate-300 dir-rtl text-right font-medium mt-0.5">
                      د باوار سټار تولیدي شرکت معامله، پریفارم، کرایه او ګټې پرمختللی حساب
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const foundObj = visibleAccounts.find(a => a.name === props.selectedAccountName);
                    navigate(`/bawar-star?partnerId=${foundObj?.id || ''}`);
                  }}
                  className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 shrink-0 transform active:scale-95 border border-blue-400/30 relative z-10"
                >
                  <Factory size={15} />
                  <span>{t('accountLedger.openBawarStarCalculator', 'Open Bawar Star Profit Calculator')}</span>
                  <ArrowUpRight size={15} />
                </button>
              </div>
            )}

            {/* LEDGER SUMMARY HEADER & STATS */}
            <div className="p-6 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/60 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-sm">
                      {selectedAccountCleanName ? selectedAccountCleanName.slice(0, 1).toUpperCase() : '#'}
                    </span>
                    <span>{selectedAccountCleanName ? `${selectedAccountCleanName} Statement` : t('accountLedger.title', 'Account Ledger') + ' Statement'}</span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                    {t('accountLedger.statementSub', 'Real-time transaction history and running financial balance')}
                  </p>
                </div>
                {props.selectedAccountName && (
                  <span className="self-start sm:self-auto px-3.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 rounded-full text-xs font-extrabold flex items-center gap-2 shadow-xs">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    {t('accountLedger.activeStatement', 'Active Statement')}
                  </span>
                )}
              </div>
              
              {/* MOBILE QUICK ACCOUNT SELECTOR (DROPDOWN FOR SMALL SCREENS) */}
              <div className="block md:hidden mb-2">
                <label className="text-[10px] font-black uppercase text-slate-400 block mb-1">{t('accountLedger.selectAccountPartner', 'Select Account / Partner')}</label>
                <select
                  value={props.selectedAccountName || ''}
                  onChange={(e) => {
                    const found = visibleAccounts.find(a => a.name === e.target.value);
                    if (found) props.onSelectAccount(found);
                  }}
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-800 border border-amber-500/40 rounded-xl text-xs font-bold text-slate-900 dark:text-white outline-none shadow-sm"
                >
                  <option value="" disabled>-- Select an Account --</option>
                  {visibleAccounts.map(a => (
                    <option key={a.id} value={a.name}>
                      {unescapeText(a.name)} (AFN {Number(a.balance || a.opening_balance_afn || 0).toLocaleString()})
                    </option>
                  ))}
                </select>
              </div>

              {/* 4 STAT CARDS IN 2x2 MOBILE GRID (ULTRA-PREMIUM GLASS CARDS) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
                {/* Opening Balance */}
                <div className="p-4.5 bg-gradient-to-br from-slate-50 to-slate-100/80 dark:from-slate-800/90 dark:to-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-2 relative overflow-hidden group hover:border-slate-300 dark:hover:border-slate-600 transition-all">
                  <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider">{t('accountLedger.openingBalance', 'Opening Balance')}</span>
                    <span className="w-7 h-7 rounded-lg bg-slate-200/80 dark:bg-slate-700/80 flex items-center justify-center text-slate-600 dark:text-slate-300">
                      <Wallet className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <div className="text-lg font-black font-mono text-slate-900 dark:text-white tracking-tight tabular-nums">
                    {props.ledgerSummary?.opening || 'AFN 0.00'}
                  </div>
                </div>

                {/* Total Cash In (Debit) */}
                <div className="p-4.5 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent dark:from-emerald-950/40 dark:via-emerald-950/20 dark:to-transparent rounded-2xl border border-emerald-500/30 dark:border-emerald-500/20 shadow-sm space-y-2 relative overflow-hidden group hover:border-emerald-500/50 transition-all">
                  <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-300">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider">{t('accountLedger.totalDebit', 'Total Debit (In)')}</span>
                    <span className="w-7 h-7 rounded-lg bg-emerald-500/20 dark:bg-emerald-500/25 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                      <TrendingUp className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <div className="text-lg font-black font-mono text-emerald-700 dark:text-emerald-300 tracking-tight tabular-nums">
                    {props.ledgerSummary?.debit || 'AFN 0.00'}
                  </div>
                </div>

                {/* Total Cash Out (Credit) */}
                <div className="p-4.5 bg-gradient-to-br from-rose-500/10 via-rose-500/5 to-transparent dark:from-rose-950/40 dark:via-rose-950/20 dark:to-transparent rounded-2xl border border-rose-500/30 dark:border-rose-500/20 shadow-sm space-y-2 relative overflow-hidden group hover:border-rose-500/50 transition-all">
                  <div className="flex items-center justify-between text-rose-700 dark:text-rose-300">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider">{t('accountLedger.totalCredit', 'Total Credit (Out)')}</span>
                    <span className="w-7 h-7 rounded-lg bg-rose-500/20 dark:bg-rose-500/25 flex items-center justify-center text-rose-600 dark:text-rose-400">
                      <TrendingDown className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <div className="text-lg font-black font-mono text-rose-700 dark:text-rose-300 tracking-tight tabular-nums">
                    {props.ledgerSummary?.credit || 'AFN 0.00'}
                  </div>
                </div>

                {/* Final Balance */}
                <div className="p-4.5 bg-gradient-to-br from-amber-500/15 via-amber-500/5 to-transparent dark:from-amber-950/60 dark:via-amber-950/30 dark:to-transparent rounded-2xl border border-amber-500/40 dark:border-amber-500/30 shadow-md shadow-amber-500/5 space-y-2 relative overflow-hidden group hover:border-amber-500/60 transition-all">
                  <div className="flex items-center justify-between text-amber-800 dark:text-amber-300">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider">{t('accountLedger.finalBalance', 'Final Net Balance')}</span>
                    <span className="w-7 h-7 rounded-lg bg-amber-500/20 dark:bg-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                      <Scale className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <div className="text-xl font-black font-mono text-amber-900 dark:text-amber-200 tracking-tight tabular-nums">
                    {props.ledgerSummary?.final || 'AFN 0.00'}
                  </div>
                </div>
              </div>
            </div>

            {/* FILTER TOOLBAR */}
            <div className="px-6 py-3.5 border-b border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs bg-white dark:bg-slate-900">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-300 text-[11px]">
                  <Filter size={13} className="text-amber-500" />
                  <span>{t('accountLedger.filters', 'Filters:')}</span>
                </div>

                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 px-3 py-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-inner">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">{t('accountLedger.fromDate', 'From')}</span>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="bg-transparent text-xs text-slate-800 dark:text-slate-200 outline-none font-bold"
                    title="From Date"
                  />
                </div>

                <span className="text-slate-400 font-extrabold text-[11px]">TO</span>

                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 px-3 py-1 rounded-xl border border-slate-200 dark:border-slate-700 shadow-inner">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide">{t('accountLedger.toDate', 'To')}</span>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="bg-transparent text-xs text-slate-800 dark:text-slate-200 outline-none font-bold"
                    title="To Date"
                  />
                </div>

                <select
                  value={currencyFilter}
                  onChange={(e) => setCurrencyFilter(e.target.value)}
                  className="px-3.5 py-1.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-bold shadow-inner"
                  aria-label="Filter by currency"
                >
                  <option value="all">{t('accountLedger.allCurrencies', 'All Currencies')}</option>
                  <option value="afn">{t('accountLedger.afnTransactions', 'AFN Transactions')}</option>
                  <option value="usd">{t('accountLedger.usdTransactions', 'USD Transactions')}</option>
                </select>

                {hasFilters && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="px-3 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl font-extrabold flex items-center gap-1.5 transition-colors border border-rose-200/60 dark:border-rose-800/60 shadow-xs"
                  >
                    <RotateCcw size={13} /> {t('accountLedger.resetFilters', 'Reset Filters')}
                  </button>
                )}
              </div>
            </div>

            {/* LEDGER TABLE AREA */}
            <div className="p-6 pt-3 overflow-x-auto">
              {props.selectedAccountName ? (
                <LedgerTable
                  rows={filteredRows}
                  dateDisplayFormat={props.dateDisplayFormat}
                  onReceipt={props.onReceipt}
                />
              ) : (
                <div className="py-28 text-center text-slate-400 space-y-4">
                  <div className="w-20 h-20 mx-auto rounded-3xl bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center text-slate-400 shadow-inner border border-slate-200/60 dark:border-slate-700/60">
                    <Users size={36} className="opacity-60" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-lg font-extrabold text-slate-800 dark:text-slate-200">{t('accountLedger.noAccountSelected', 'No Account Selected')}</h4>
                    <p className="text-xs max-w-sm mx-auto text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                      {t('accountLedger.noAccountSelectedDesc', 'Select an account from the left sidebar to view its complete statement, running balance, and real-time transaction history.')}
                    </p>
                  </div>
                </div>
              )}
            </div>

          </div>
        </main>

      </div>
    </div>
  );
}

