import React, { useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Search, 
  UserPlus, 
  Users, 
  ScrollText, 
  Edit, 
  Trash2, 
  Plus, 
  Download, 
  X,
  Filter,
  CheckCircle2,
  AlertCircle,
  Building2,
  User,
  Briefcase,
  Wallet,
  Phone,
  MapPin,
  FileText
} from 'lucide-react';
import DataTable from '../components/DataTable';
import { currency } from '../utils/format';

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

export default function Accounts({ 
  accounts = [], 
  form, 
  setForm, 
  onSave, 
  onEdit, 
  onDelete, 
  search = '', 
  setSearch 
}) {
  const { t } = useTranslation();
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('all');

  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const resetForm = () => {
    setForm({
      name: '',
      account_type: 'customer',
      phone: '',
      address: '',
      opening_balance_afn: '',
      opening_balance_usd: '',
      note: ''
    });
  };

  const filteredAccounts = useMemo(() => {
    return accounts.filter((account) => {
      const cleanName = unescapeText(account.name);
      const cleanPhone = unescapeText(account.phone);
      const cleanType = unescapeText(account.account_type);
      const matchesSearch = !search || `${cleanName} ${cleanPhone} ${cleanType}`.toLowerCase().includes(search.toLowerCase());
      const matchesType = selectedTypeFilter === 'all' || account.account_type?.toLowerCase() === selectedTypeFilter.toLowerCase();
      return matchesSearch && matchesType;
    });
  }, [accounts, search, selectedTypeFilter]);

  const accountCounts = useMemo(() => {
    return {
      total: accounts.length,
      customers: accounts.filter((a) => a.account_type === 'customer').length,
      suppliers: accounts.filter((a) => a.account_type === 'supplier').length,
      workers: accounts.filter((a) => a.account_type === 'worker').length,
      factories: accounts.filter((a) => a.account_type === 'factory').length,
      expenses: accounts.filter((a) => a.account_type === 'expense').length,
      afnTotal: accounts.reduce((acc, a) => acc + Number(a.opening_balance_afn || 0), 0),
      usdTotal: accounts.reduce((acc, a) => acc + Number(a.opening_balance_usd || 0), 0)
    };
  }, [accounts]);

  const getAvatarGradient = (type) => {
    switch (type?.toLowerCase()) {
      case 'customer':
        return 'from-blue-600 to-cyan-500 text-white shadow-blue-500/20';
      case 'supplier':
        return 'from-purple-600 to-indigo-500 text-white shadow-purple-500/20';
      case 'worker':
        return 'from-emerald-600 to-teal-500 text-white shadow-emerald-500/20';
      case 'factory':
        return 'from-amber-500 to-orange-600 text-white shadow-amber-500/20';
      case 'expense':
        return 'from-rose-500 to-pink-600 text-white shadow-rose-500/20';
      default:
        return 'from-slate-600 to-zinc-700 text-white shadow-slate-500/20';
    }
  };

  const getTypeBadgeClass = (type) => {
    switch (type?.toLowerCase()) {
      case 'customer':
        return 'bg-blue-100 dark:bg-blue-950/70 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800';
      case 'supplier':
        return 'bg-purple-100 dark:bg-purple-950/70 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800';
      case 'worker':
        return 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800';
      case 'factory':
        return 'bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800';
      case 'expense':
        return 'bg-rose-100 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
    }
  };

  const exportAccountsCSV = () => {
    if (!filteredAccounts.length) return;
    const headers = ["ID", "Name", "Type", "Phone", "Address", "Opening AFN", "Opening USD", "Note"];
    const rows = filteredAccounts.map(a => [
      a.id,
      `"${(a.name || '').replace(/"/g, '""')}"`,
      a.account_type || '',
      `"${a.phone || ''}"`,
      `"${(a.address || '').replace(/"/g, '""')}"`,
      a.opening_balance_afn || 0,
      a.opening_balance_usd || 0,
      `"${(a.note || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `account_directory_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns = useMemo(() => [
    { 
      key: 'name', 
      label: t('Account Info'), 
      sortable: true,
      render: (row) => {
        const cleanName = unescapeText(row.name);
        const cleanAddress = unescapeText(row.address);
        return (
          <div className="flex items-center gap-3 py-1">
            <div className={`w-8 h-8 rounded-full bg-gradient-to-tr ${getAvatarGradient(row.account_type)} font-black text-xs flex items-center justify-center shrink-0 shadow-xs border border-white/20`}>
              {cleanName.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <strong className="text-xs font-extrabold text-slate-900 dark:text-white truncate block leading-snug">{cleanName}</strong>
              {cleanAddress && <span className="text-[11px] text-slate-400 truncate block mt-0.5">{cleanAddress}</span>}
            </div>
          </div>
        );
      },
      className: 'col-account-info'
    },
    { 
      key: 'account_type', 
      label: t('Type'), 
      sortable: true,
      render: (row) => (
        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase inline-block ${getTypeBadgeClass(row.account_type)}`}>
          {row.account_type}
        </span>
      ),
      className: 'col-account-type'
    },
    { 
      key: 'phone', 
      label: t('Phone'), 
      render: (row) => <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-300">{row.phone || '-'}</span>, 
      className: 'col-phone' 
    },
    { 
      key: 'opening_balance_afn', 
      label: t('Opening AFN'), 
      sortable: true,
      render: (row) => (
        <span className="text-xs font-mono font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums">
          {currency(row.opening_balance_afn || 0)}
        </span>
      ), 
      className: 'col-amount text-right' 
    },
    { 
      key: 'opening_balance_usd', 
      label: t('Opening USD'), 
      sortable: true,
      render: (row) => (
        <span className="text-xs font-mono font-extrabold text-slate-700 dark:text-slate-300 tabular-nums">
          {currency(row.opening_balance_usd || 0, 'USD')}
        </span>
      ), 
      className: 'col-amount text-right' 
    },
    { 
      key: 'actions', 
      label: t('Actions'), 
      className: 'col-actions text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <NavLink 
            to={`/ledger?account=${row.id}`} 
            className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500 text-amber-700 dark:text-amber-300 hover:text-white dark:hover:text-white text-xs font-bold transition-all flex items-center gap-1 shadow-xs border border-amber-500/20" 
            title={t('View Ledger')}
          >
            <ScrollText size={13} />
            <span>{t('Ledger')}</span>
          </NavLink>
          <button 
            type="button" 
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-blue-600 hover:text-white dark:bg-slate-800 dark:hover:bg-blue-600 text-slate-600 dark:text-slate-300 transition-all shadow-xs" 
            onClick={() => onEdit(row)}
            title={t('Edit Account')}
          >
            <Edit size={15} />
          </button>
          <button 
            type="button" 
            className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-600 hover:text-white dark:bg-slate-800 dark:hover:bg-rose-600 text-rose-600 dark:text-rose-400 transition-all shadow-xs" 
            onClick={() => onDelete(row)}
            title={t('Delete Account')}
          >
            <Trash2 size={15} />
          </button>
        </div>
      )
    }
  ], [onEdit, onDelete, t]);

  const headerContent = (
    <div className="account-directory-header flex flex-col sm:flex-row sm:items-center justify-between gap-3 w-full">
      <div className="directory-title-area flex items-center gap-3">
        <div className="title-icon-badge w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold">
          <Users size={18} />
        </div>
        <div>
          <h3 className="directory-title text-base font-extrabold text-slate-900 dark:text-white tracking-tight">{t('Account Directory')}</h3>
          <span className="directory-count text-xs text-slate-500 font-medium">{filteredAccounts.length} {t('records')}</span>
        </div>
      </div>

      <div className="directory-controls flex items-center gap-2">
        <button
          type="button"
          onClick={exportAccountsCSV}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer"
          title="Export CSV"
        >
          <Download size={14} />
          <span>Export CSV</span>
        </button>

        <div className="search-field relative flex items-center">
          <Search size={15} className="absolute left-3 text-slate-400 pointer-events-none" />
          <input 
            type="search" 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            placeholder={t('Search accounts...')} 
            className="pl-9 pr-8 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium"
          />
          {search && (
            <button type="button" className="absolute right-2 text-slate-400 hover:text-slate-600" onClick={() => setSearch('')}>
              <X size={14} />
            </button>
          )}
        </div>

        <div className="filter-select-wrap flex items-center gap-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-2.5 py-1 text-xs">
          <Filter size={14} className="text-slate-400" />
          <select 
            value={selectedTypeFilter} 
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
            className="bg-transparent text-xs text-slate-800 dark:text-slate-200 outline-none font-bold cursor-pointer"
            aria-label="Filter accounts by type"
          >
            <option value="all">{t('All Types')}</option>
            <option value="customer">{t('Customer')}</option>
            <option value="supplier">{t('Supplier')}</option>
            <option value="worker">{t('Worker')}</option>
            <option value="factory">{t('Factory')}</option>
            <option value="expense">{t('Expense')}</option>
            <option value="other">{t('Other')}</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderMobileCard = (row) => {
    const cleanName = unescapeText(row.name);
    const cleanAddress = unescapeText(row.address);
    const cleanPhone = unescapeText(row.phone);

    return (
      <div key={row.id} className="account-mobile-card p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-3.5 shadow-sm mb-3">
        <div className="account-mobile-card__header flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-sm">
              {cleanName.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <strong className="account-mobile-card__name text-sm font-black text-slate-900 dark:text-white truncate block leading-snug">{cleanName}</strong>
              {cleanPhone ? (
                <span className="text-xs text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                  <Phone size={12} className="text-amber-500" /> {cleanPhone}
                </span>
              ) : cleanAddress ? (
                <p className="account-mobile-card__address text-xs text-slate-400 truncate mt-0.5">{cleanAddress}</p>
              ) : (
                <span className="text-[11px] text-slate-400 italic">No contact phone</span>
              )}
            </div>
          </div>
          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 ${getTypeBadgeClass(row.account_type)}`}>
            {row.account_type}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 bg-slate-50/80 dark:bg-slate-800/40 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800/60 text-xs font-mono">
          <div>
            <span className="text-[10px] uppercase font-extrabold text-slate-400 block">{t('Opening AFN')}</span>
            <strong className="text-sm font-black text-emerald-600 dark:text-emerald-400 block mt-0.5">
              {currency(row.opening_balance_afn || 0)}
            </strong>
          </div>
          <div>
            <span className="text-[10px] uppercase font-extrabold text-slate-400 block">{t('Opening USD')}</span>
            <strong className="text-sm font-black text-slate-800 dark:text-slate-200 block mt-0.5">
              {currency(row.opening_balance_usd || 0, 'USD')}
            </strong>
          </div>
        </div>

        <div className="account-mobile-card__footer flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
          <NavLink 
            to={`/ledger?account=${row.id}`} 
            className="flex-1 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
          >
            <ScrollText size={15} />
            <span>{t('View Ledger')}</span>
          </NavLink>

          <button 
            type="button" 
            className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-extrabold flex items-center gap-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95" 
            onClick={() => onEdit(row)}
          >
            <Edit size={15} className="text-blue-500" />
            <span>{t('Edit')}</span>
          </button>

          <button 
            type="button" 
            className="px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-xs font-extrabold flex items-center gap-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-all active:scale-95" 
            onClick={() => onDelete(row)}
          >
            <Trash2 size={15} />
            <span>{t('Delete')}</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="accounts-page space-y-6">
      {/* 1. PAGE HEADER */}
      <header className="accounts-page-header bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="eyebrow text-xs font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">{t('Financial Records')}</span>
          <h1 className="page-title text-2xl font-black text-slate-900 dark:text-white tracking-tight mt-0.5">{t('Accounts Management')}</h1>
          <p className="page-description text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
            {t('Manage customers, suppliers, workers, factory accounts, and expenses.')}
          </p>
        </div>

        {/* Category Filter Pills & Summary Metrics */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'all', label: t('All Accounts'), count: accountCounts.total, color: 'slate' },
            { id: 'customer', label: t('Customers'), count: accountCounts.customers, color: 'blue' },
            { id: 'supplier', label: t('Suppliers'), count: accountCounts.suppliers, color: 'purple' },
            { id: 'worker', label: t('Workers'), count: accountCounts.workers, color: 'emerald' },
            { id: 'factory', label: t('Factories'), count: accountCounts.factories, color: 'amber' },
            { id: 'expense', label: t('Expenses'), count: accountCounts.expenses, color: 'rose' }
          ].map(({ id, label, count, color }) => (
            <button
              key={id}
              type="button"
              onClick={() => setSelectedTypeFilter(id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all active:scale-95 cursor-pointer ${
                selectedTypeFilter === id
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-sm'
                  : `bg-${color}-50 dark:bg-${color}-950/40 text-${color}-800 dark:text-${color}-300 border-${color}-200/80 dark:border-${color}-800/80 hover:bg-${color}-100`
              }`}
            >
              <span>{label}</span>
              <span className={`px-1.5 py-0.2 text-[10px] font-black rounded-full ${selectedTypeFilter === id ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900' : 'bg-black/10 dark:bg-white/10'}`}>{count}</span>
            </button>
          ))}
        </div>
      </header>

      {/* 2. TWO-COLUMN BALANCED LAYOUT */}
      <div className="accounts-layout grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT FORM CARD */}
        <div className="account-form-card lg:col-span-4 xl:col-span-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="account-form-card__header flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="form-title-badge w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold shrink-0">
              <UserPlus size={20} />
            </div>
            <div>
              <h3 className="form-title text-sm font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">{form.id ? t('Edit Account') : t('Add New Account')}</h3>
              <p className="form-subtext text-xs text-slate-500 dark:text-slate-400 font-medium">{t('Fill out account details below.')}</p>
            </div>
          </div>
          
          <form className="account-form space-y-3.5" onSubmit={onSave}>
            <div className="form-field">
              <label className="field-label text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">{t('ACCOUNT NAME *')}</label>
              <input 
                autoFocus 
                type="text" 
                value={form.name || ''} 
                onChange={(e) => update('name', e.target.value)} 
                placeholder={t('Full name or company')} 
                required 
                dir="auto" 
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium transition-all" 
              />
            </div>
            
            <div className="form-field">
              <label className="field-label text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">{t('ACCOUNT TYPE *')}</label>
              <select 
                value={form.account_type || 'customer'} 
                onChange={(e) => update('account_type', e.target.value)} 
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-bold transition-all"
              >
                <option value="customer">👤 {t('Customer')}</option>
                <option value="supplier">🏬 {t('Supplier')}</option>
                <option value="worker">🛠️ {t('Worker')}</option>
                <option value="factory">🏭 {t('Factory')}</option>
                <option value="expense">💸 {t('Expense')}</option>
                <option value="other">📁 {t('Other')}</option>
              </select>
              <div className="flex items-center gap-1.5 mt-1.5 overflow-x-auto pb-1 scrollbar-none">
                {[
                  { id: 'customer', label: '👤 Customer' },
                  { id: 'supplier', label: '🏬 Supplier' },
                  { id: 'worker', label: '🛠️ Worker' },
                  { id: 'factory', label: '🏭 Factory' },
                  { id: 'expense', label: '💸 Expense' }
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => update('account_type', id)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all shrink-0 border ${
                      form.account_type === id
                        ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="form-field">
                <label className="field-label text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">{t('PHONE')}</label>
                <input 
                  type="text" 
                  value={form.phone || ''} 
                  onChange={(e) => update('phone', e.target.value)} 
                  placeholder={t('Phone number')} 
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium transition-all" 
                />
              </div>
              <div className="form-field">
                <label className="field-label text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">{t('ADDRESS')}</label>
                <input 
                  type="text" 
                  value={form.address || ''} 
                  onChange={(e) => update('address', e.target.value)} 
                  placeholder={t('Address')} 
                  dir="auto" 
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium transition-all" 
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="form-field">
                <label className="field-label text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">{t('OPENING AFN')}</label>
                <input 
                  type="number" 
                  value={form.opening_balance_afn ?? ''} 
                  onChange={(e) => update('opening_balance_afn', e.target.value)} 
                  placeholder="0.00" 
                  step="0.01" 
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono font-bold transition-all" 
                />
              </div>
              <div className="form-field">
                <label className="field-label text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">{t('OPENING USD')}</label>
                <input 
                  type="number" 
                  value={form.opening_balance_usd ?? ''} 
                  onChange={(e) => update('opening_balance_usd', e.target.value)} 
                  placeholder="0.00" 
                  step="0.01" 
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-mono font-bold transition-all" 
                />
              </div>
            </div>

            <div className="form-field">
              <label className="field-label text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 block">{t('NOTES')}</label>
              <input 
                type="text" 
                value={form.note || ''} 
                onChange={(e) => update('note', e.target.value)} 
                placeholder={t('Optional note')} 
                dir="auto" 
                className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl text-xs text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium transition-all" 
              />
            </div>

            <div className="account-form-actions flex items-center justify-end gap-2 pt-2">
              {form.id ? (
                <button type="button" className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors" onClick={resetForm}>
                  {t('Cancel Edit')}
                </button>
              ) : (
                <button type="button" className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors" onClick={resetForm}>
                  {t('Clear')}
                </button>
              )}
              <button className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-md shadow-amber-500/20 transition-all" type="submit">
                {form.id ? t('Save Changes') : t('Create Account')}
              </button>
            </div>
          </form>
        </div>

        {/* RIGHT DIRECTORY CARD */}
        <div className="account-directory-card lg:col-span-8 xl:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          <DataTable
            columns={columns}
            data={filteredAccounts}
            keyField="id"
            headerContent={headerContent}
            renderMobileCard={renderMobileCard}
            emptyTitle={t('No accounts found')}
            emptyDescription={t('Create a customer, supplier, worker, or expense account to see it here.')}
          />
        </div>
      </div>
    </div>
  );
}
