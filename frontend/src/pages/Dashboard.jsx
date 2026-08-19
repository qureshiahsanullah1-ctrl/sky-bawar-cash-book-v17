import { useState, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import GoogleIcon from '../components/GoogleIcon';
import SimpleCashChart from '../components/SimpleCashChart';
import AdvancedAnalyticsCharts from '../components/AdvancedAnalyticsCharts';
import { currency, signedCurrency, dateLabel } from '../utils/format';

const companyFallback = 'Cashbook Of All Companies';

function getInitials(name) {
  if (!name) return 'AQ';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function getMetricStyle(c, styles) {
  if (c === 'emerald') return styles.emerald;
  if (c === 'rose') return styles.rose;
  if (c === 'violet') return styles.violet;
  if (c === 'amber') return styles.amber;
  return styles.blue;
}

function MetricCard({ title, value, secondaryValue, googleIcon, icon: Icon, color, subtext, badge }) {
  const colorStyles = {
    emerald: {
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-800/50',
      badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
    },
    rose: {
      bg: 'bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-200/50 dark:border-rose-800/50',
      badge: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
    },
    blue: {
      bg: 'bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-200/50 dark:border-indigo-800/50',
      badge: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300'
    },
    violet: {
      bg: 'bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-200/50 dark:border-purple-800/50',
      badge: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
    },
    amber: {
      bg: 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-200/50 dark:border-amber-800/50',
      badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
    }
  };
  const currentStyle = getMetricStyle(color, colorStyles);

  return (
    <div className="glass-card p-3 sm:p-4 rounded-2xl flex flex-col justify-between gap-1 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-all active:scale-[0.99] duration-150">
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className={`p-1.5 rounded-xl ${currentStyle.bg} border flex items-center justify-center shrink-0 shadow-2xs`}>
            {googleIcon ? <GoogleIcon name={googleIcon} size={16} /> : Icon ? <Icon size={14} /> : null}
          </div>
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
            {title}
          </span>
        </div>
        {badge && (
          <span className={`text-[8.5px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider shrink-0 ${currentStyle.badge}`}>
            {badge}
          </span>
        )}
      </div>
      <div className="mt-1">
        <strong className="text-sm sm:text-lg font-black font-mono tracking-tight text-slate-900 dark:text-white tabular-nums truncate block">
          {value}
        </strong>
        {secondaryValue && (
          <span className="text-[10.5px] sm:text-xs font-mono font-bold text-slate-500 dark:text-slate-400 block truncate mt-0.5">
            {secondaryValue}
          </span>
        )}
        {subtext && (
          <p className="text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500 font-medium truncate mt-0.5">
            {subtext}
          </p>
        )}
      </div>
    </div>
  );
}

function QuickActions({ onNavigate, onPrint, onBackup }) {
  const { t } = useTranslation();

  const actions = [
    {
      id: 'employees',
      label: t('dashboard.employeesSalaries', 'Salaries'),
      desc: 'Payroll & staff',
      iconName: 'badge',
      color: 'bg-indigo-500/10 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 border-indigo-200/50 dark:border-indigo-800/50',
      action: () => onNavigate('employees')
    },
    {
      id: 'accounts',
      label: t('dashboard.accounts', 'Accounts'),
      desc: 'Parties & clients',
      iconName: 'group',
      color: 'bg-sky-500/10 text-sky-600 dark:bg-sky-500/20 dark:text-sky-400 border-sky-200/50 dark:border-sky-800/50',
      action: () => onNavigate('accounts')
    },
    {
      id: 'ledger',
      label: t('dashboard.accountLedger', 'Ledger'),
      desc: 'Account history',
      iconName: 'menu_book',
      color: 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border-amber-200/50 dark:border-amber-800/50',
      action: () => onNavigate('ledger')
    },
    {
      id: 'converter',
      label: t('dashboard.currencyConverter', 'Converter'),
      desc: 'AFN / USD rates',
      iconName: 'currency_exchange',
      color: 'bg-cyan-500/10 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-400 border-cyan-200/50 dark:border-cyan-800/50',
      action: () => onNavigate('converter')
    },
    {
      id: 'reports',
      label: t('dashboard.financialReports', 'Reports'),
      desc: 'Financial insights',
      iconName: 'analytics',
      color: 'bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 border-purple-200/50 dark:border-purple-800/50',
      action: () => onNavigate('reports')
    },
    {
      id: 'bawar-star',
      label: t('dashboard.bawarStar', 'Bawar Star'),
      desc: 'Production ERP',
      iconName: 'precision_manufacturing',
      color: 'bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400 border-orange-200/50 dark:border-orange-800/50',
      action: () => onNavigate('bawar-star')
    },
    {
      id: 'print',
      label: t('dashboard.printView', 'Print Studio'),
      desc: 'Vouchers & PDF',
      iconName: 'print',
      color: 'bg-slate-500/10 text-slate-600 dark:bg-slate-500/20 dark:text-slate-300 border-slate-200/50 dark:border-slate-800/50',
      action: onPrint
    },
    {
      id: 'backup',
      label: t('dashboard.backupData', 'Backup & Sync'),
      desc: 'Save snapshot',
      iconName: 'cloud_sync',
      color: 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-800/50',
      action: onBackup
    }
  ];

  return (
    <div className="glass-card p-3 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-2">
          <GoogleIcon name="bolt" size={18} className="text-indigo-500" filled />
          <span className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-200 tracking-tight">
            {t('dashboard.quickActions', 'Quick Actions & Shortcuts')}
          </span>
        </div>
        <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 hidden sm:inline-block">
          One-tap access to all modules
        </span>
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-4 md:grid-cols-8 gap-2 sm:gap-2.5">
        {actions.map((act) => {
          return (
            <button
              key={act.id}
              type="button"
              onClick={act.action}
              className="flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/60 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 transition-all duration-150 active:scale-90 shadow-2xs group"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shadow-2xs group-hover:scale-105 transition-transform duration-150 ${act.color}`}>
                <GoogleIcon name={act.iconName} size={20} />
              </div>
              <span className="text-[10.5px] font-extrabold text-slate-800 dark:text-slate-200 text-center leading-tight mt-1.5 line-clamp-1">
                {act.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function Dashboard({
  summary = {},
  latestTransactions = [],
  transactions = [],
  onNavigate,
  onBackup,
  onRestore,
  onPrint,
  activeTransactionType,
  setActiveTransactionType,
  isLoading,
  currentUser,
  companyName
}) {
  const { t } = useTranslation();
  const [selectedCurrency, setSelectedCurrency] = useState('AFN'); // 'AFN' | 'USD' | 'ALL'
  const displayCompanyName = companyName || companyFallback;
  const userName = currentUser?.full_name || currentUser?.username || 'Ahsanullah Qureshi';
  const userInitials = getInitials(userName);
  const greeting = getGreeting();

  // Sort newest transactions first
  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [transactions]);

  const recentTransactions = useMemo(() => {
    return sortedTransactions.slice(0, 8);
  }, [sortedTransactions]);

  // Calculations using backend summary with fallback
  const cashInAfn = Number(summary.cash_in_afn || summary.total_cash_in || 0);
  const cashOutAfn = Number(summary.cash_out_afn || summary.total_cash_out || 0);
  const currentBalanceAfn = summary.afn_balance !== undefined ? Number(summary.afn_balance) : (cashInAfn - cashOutAfn);

  const usdIn = Number(summary.usd_in || 0);
  const usdOut = Number(summary.usd_out || 0);
  const usdBalance = summary.usd_balance !== undefined ? Number(summary.usd_balance) : (usdIn - usdOut);

  const totalTxCount = transactions.length || summary.today_transactions || 0;

  const todayCount = useMemo(() => {
    if (summary?.today_transactions) return summary.today_transactions;
    const todayStr = new Date().toISOString().split('T')[0];
    return (transactions || []).filter(t => (t.date || t.created_at || '').startsWith(todayStr)).length;
  }, [summary?.today_transactions, transactions]);

  const monthCount = useMemo(() => {
    if (summary?.monthly_transactions) return summary.monthly_transactions;
    const monthStr = new Date().toISOString().slice(0, 7);
    return (transactions || []).filter(t => (t.date || t.created_at || '').startsWith(monthStr)).length;
  }, [summary?.monthly_transactions, transactions]);

  return (
    <div className="dashboard-page flex flex-col gap-3 sm:gap-4 w-full pb-28 sm:pb-8">
      
      {/* 1. Sleek Welcome & Profile Header */}
      <div className="dashboard-welcome-card glass-card p-3 sm:p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div className="welcome-avatar-block flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="welcome-avatar w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 text-white font-black flex items-center justify-center text-sm shadow-md ring-2 ring-white/30 dark:ring-slate-800/60">
              {userInitials}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900 animate-pulse"></span>
          </div>
          <div className="welcome-info min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-[10.5px] sm:text-xs text-slate-500 font-medium leading-none">{greeting},</p>
              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200/50 dark:border-emerald-800/50">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                {t('dashboard.liveSync', 'Live Sync')}
              </span>
            </div>
            <h2 className="welcome-greeting text-sm sm:text-lg font-black text-slate-900 dark:text-white truncate mt-0.5">
              {userName}
            </h2>
            <p className="welcome-subtext text-[10.5px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5 truncate">
              <span className="font-bold text-slate-700 dark:text-slate-300 truncate">{displayCompanyName}</span>
              <span>&bull;</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">{t('dashboard.upToDate', 'Up to date')}</span>
            </p>
          </div>
        </div>

        <div className="welcome-stats flex items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800/80">
          <div className="stat-pill flex-1 sm:flex-initial px-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 flex items-center gap-2 text-xs">
            <GoogleIcon name="today" size={16} className="text-indigo-500 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[8px] uppercase font-bold text-slate-400">{t('dashboard.today', 'Today')}</span>
              <strong className="text-[11px] font-bold text-slate-800 dark:text-slate-200">{todayCount} entries</strong>
            </div>
          </div>
          <div className="stat-pill flex-1 sm:flex-initial px-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 flex items-center gap-2 text-xs">
            <GoogleIcon name="date_range" size={16} className="text-purple-500 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[8px] uppercase font-bold text-slate-400">{t('dashboard.thisMonth', 'This Month')}</span>
              <strong className="text-[11px] font-bold text-slate-800 dark:text-slate-200">{monthCount} entries</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Hero Financial Balance Card (Centerpiece) */}
      <div className="relative overflow-hidden glass-card p-4 sm:p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-md bg-gradient-to-br from-slate-900/[0.03] via-indigo-500/[0.04] to-purple-500/[0.03] dark:from-slate-900/90 dark:via-indigo-950/40 dark:to-purple-950/30 backdrop-blur-xl">
        {/* Background glow orb */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col gap-4">
          {/* Card Top Row: Label & Currency Switcher */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                <GoogleIcon name="account_balance_wallet" size={16} />
              </div>
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t('dashboard.totalAvailableCash', 'Total Available Cash')}
              </span>
            </div>

            {/* Currency Switcher */}
            <div className="flex items-center gap-1 bg-white/80 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
              <button
                type="button"
                className={`px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold transition-all ${
                  selectedCurrency === 'AFN'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
                onClick={() => setSelectedCurrency('AFN')}
              >
                AFN
              </button>
              <button
                type="button"
                className={`px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold transition-all ${
                  selectedCurrency === 'USD'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
                onClick={() => setSelectedCurrency('USD')}
              >
                USD
              </button>
              <button
                type="button"
                className={`px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold transition-all ${
                  selectedCurrency === 'ALL'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
                onClick={() => setSelectedCurrency('ALL')}
              >
                Dual
              </button>
            </div>
          </div>

          {/* Main Balance Display */}
          <div className="flex flex-col">
            <div className="flex items-baseline gap-2">
              <strong className="text-2xl sm:text-4xl font-black font-mono tracking-tight text-slate-900 dark:text-white tabular-nums">
                {selectedCurrency === 'USD'
                  ? currency(usdBalance, 'USD')
                  : currency(currentBalanceAfn, 'AFN')}
              </strong>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                (selectedCurrency === 'USD' ? usdBalance : currentBalanceAfn) >= 0
                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60'
                  : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/60'
              }`}>
                {(selectedCurrency === 'USD' ? usdBalance : currentBalanceAfn) >= 0 ? '✓ Positive Reserve' : 'Deficit'}
              </span>
            </div>

            {selectedCurrency === 'ALL' && (
              <span className="text-xs sm:text-sm font-mono font-extrabold text-indigo-600 dark:text-indigo-400 mt-0.5">
                Foreign Reserve: {currency(usdBalance, 'USD')}
              </span>
            )}
          </div>

          {/* Primary Action Buttons (Add Cash In & Add Cash Out) */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              type="button"
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-emerald-500/20 active:scale-95 transition-all duration-150"
              onClick={() => {
                setActiveTransactionType(activeTransactionType === 'cash_in' ? null : 'cash_in');
                onNavigate('cashbook');
              }}
            >
              <GoogleIcon name="south_west" size={18} />
              <span>{t('dashboard.addCashIn', 'Add Cash In')}</span>
            </button>

            <button
              type="button"
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-rose-500/20 active:scale-95 transition-all duration-150"
              onClick={() => {
                setActiveTransactionType(activeTransactionType === 'cash_out' ? null : 'cash_out');
                onNavigate('cashbook');
              }}
            >
              <GoogleIcon name="north_east" size={18} />
              <span>{t('dashboard.addCashOut', 'Add Cash Out')}</span>
            </button>
          </div>

          {/* Inflow / Outflow Summary Strip inside Hero Card */}
          <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-200/60 dark:border-slate-800/80">
            <div className="flex items-center gap-2 p-2 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/50">
              <div className="w-6 h-6 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <GoogleIcon name="arrow_downward" size={14} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] uppercase font-bold text-slate-400">Total Cash In</span>
                <strong className="text-xs sm:text-sm font-mono font-extrabold text-emerald-600 dark:text-emerald-400 truncate">
                  {currency(cashInAfn, 'AFN')}
                </strong>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-xl bg-white/60 dark:bg-slate-900/60 border border-slate-200/50 dark:border-slate-800/50">
              <div className="w-6 h-6 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <GoogleIcon name="arrow_upward" size={14} />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-[9px] uppercase font-bold text-slate-400">Total Cash Out</span>
                <strong className="text-xs sm:text-sm font-mono font-extrabold text-rose-600 dark:text-rose-400 truncate">
                  {currency(cashOutAfn, 'AFN')}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Operational 4-Card Metric Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
        <MetricCard
          title="Total Cash In (AFN)"
          value={currency(cashInAfn, 'AFN')}
          googleIcon="south_west"
          color="emerald"
          badge="Inflow"
          subtext={`${totalTxCount} total transactions`}
        />
        <MetricCard
          title="Total Cash Out (AFN)"
          value={currency(cashOutAfn, 'AFN')}
          googleIcon="north_east"
          color="rose"
          badge="Outflow"
          subtext="Verified accurate balance"
        />
        <MetricCard
          title="Current AFN Balance"
          value={currency(currentBalanceAfn, 'AFN')}
          googleIcon="account_balance_wallet"
          color={currentBalanceAfn >= 0 ? "blue" : "rose"}
          badge="Net"
          subtext={currentBalanceAfn >= 0 ? "Positive Net Balance" : "Deficit Balance"}
        />
        <MetricCard
          title="Total Transactions"
          value={totalTxCount}
          googleIcon="query_stats"
          color="violet"
          badge="Database"
          subtext="Recorded in database"
        />
      </div>

      {/* 4. App Shortcuts & Feature Grid (Clean 4-Column Icon Grid) */}
      <QuickActions
        onNavigate={onNavigate}
        onPrint={onPrint}
        onBackup={onBackup}
      />

      {/* 5. Recent Transactions & Cashflow Split */}
      <div className="dashboard-main-split">
        {/* Recent Transactions Card */}
        <div className="recent-transactions-card glass-card p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="card-header flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <h3 className="card-title text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                {t('dashboard.recentTransactions', 'Recent Transactions')}
              </h3>
              <span className="record-count-badge text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {recentTransactions.length} items
              </span>
            </div>
            <NavLink to="/cashbook" className="view-all-link text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1 hover:underline">
              <span>{t('dashboard.viewAll', 'View all')}</span>
              <GoogleIcon name="arrow_forward" size={14} />
            </NavLink>
          </div>

          {/* Desktop Table View */}
          <div className="recent-table-wrapper">
            <table className="recent-transactions-table">
              <thead>
                <tr>
                  <th>{t('dashboard.accountName', 'Account Name')}</th>
                  <th>{t('dashboard.date', 'Date')}</th>
                  <th>{t('dashboard.type', 'Type')}</th>
                  <th className="text-right">{t('dashboard.amount', 'Amount')}</th>
                  <th>{t('dashboard.status', 'Status')}</th>
                </tr>
              </thead>
              <tbody>
                {recentTransactions.map((tx) => {
                  const isCashIn = tx.transaction_type === 'cash_in';
                  const amount = isCashIn ? (tx.cash_in_afn || tx.usd_in) : (tx.cash_out_afn || tx.usd_out);
                  const isUsd = Boolean(tx.usd_in || tx.usd_out);
                  return (
                    <tr key={tx.id}>
                      <td className="account-cell">
                        <strong className="account-name">{tx.account_name || 'General'}</strong>
                        {tx.detail && <span className="account-detail">{tx.detail}</span>}
                      </td>
                      <td className="date-cell">{dateLabel(tx.date)}</td>
                      <td>
                        <span className={`badge-type ${isCashIn ? 'badge-cash-in' : 'badge-cash-out'}`}>
                          {isCashIn ? 'Cash In' : 'Cash Out'}
                        </span>
                      </td>
                      <td className={`amount-cell text-right ${isCashIn ? 'amount-in' : 'amount-out'}`}>
                        {signedCurrency(amount, tx.transaction_type, isUsd ? 'USD' : 'AFN')}
                      </td>
                      <td>
                        <span className="badge-status">
                          <GoogleIcon name="check_circle" size={14} className="text-emerald-500" filled />
                          <span>{t('dashboard.completed', 'Completed')}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {recentTransactions.length === 0 && (
                  <tr>
                    <td colSpan="5" className="empty-state-cell text-center py-6 text-slate-400 text-xs">
                      {t('dashboard.noTransactions', 'No transactions recorded yet. Click "Add Cash In" or "Add Cash Out" to create an entry.')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View (<760px) */}
          <div className="recent-mobile-cards mt-3">
            {recentTransactions.map((tx) => {
              const isCashIn = tx.transaction_type === 'cash_in';
              const isUsd = Boolean(tx.usd_in || tx.usd_out);
              const amount = isCashIn
                ? (tx.cash_in_afn || tx.usd_in || 0)
                : (tx.cash_out_afn || tx.usd_out || 0);

              return (
                <div
                  key={tx.id}
                  className="mobile-tx-card p-3 rounded-2xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between gap-3 active:scale-[0.98] transition-transform duration-100"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isCashIn
                      ? 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200/40 dark:border-emerald-800/40'
                      : 'bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-200/40 dark:border-rose-800/40'
                  }`}>
                    <GoogleIcon name={isCashIn ? "south_west" : "north_east"} size={18} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                        {tx.account_name || 'General Account'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                      <span>{dateLabel(tx.date)}</span>
                      {tx.detail && <span className="truncate">&bull; {tx.detail}</span>}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className={`font-mono font-black text-xs sm:text-sm block ${
                      isCashIn ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                    }`}>
                      {signedCurrency(amount, tx.transaction_type, isUsd ? 'USD' : 'AFN')}
                    </span>
                    <span className={`text-[9px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                      isCashIn ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300'
                    }`}>
                      {isCashIn ? 'Cash In' : 'Cash Out'}
                    </span>
                  </div>
                </div>
              );
            })}
            {recentTransactions.length === 0 && (
              <div className="p-6 text-center text-xs text-slate-500 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center gap-2">
                <GoogleIcon name="receipt_long" size={24} className="text-slate-400" />
                <span>{t('dashboard.noTransactions', 'No transactions recorded yet.')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Chronological Cash Flow Chart */}
        <div className="glass-card cash-flow-chart-card p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="card-header pb-2">
            <h3 className="card-title text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
              {t('dashboard.cashFlow', 'Chronological Cash Flow')}
            </h3>
          </div>
          <div className="chart-body">
            <SimpleCashChart transactions={sortedTransactions} />
          </div>
        </div>
      </div>

      {/* Advanced Analytics */}
      <AdvancedAnalyticsCharts transactions={transactions} summary={summary} />
    </div>
  );
}

