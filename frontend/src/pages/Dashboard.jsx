import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  CalendarRange,
  DatabaseBackup,
  FileText,
  Landmark,
  Printer,
  WalletCards,
  ChevronDown,
  ArrowRight,
  TrendingUp,
  Receipt,
  CheckCircle2,
  ListFilter,
  UsersRound,
  Users,
  RefreshCw
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
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
  return styles.blue;
}

function MetricCard({ title, value, icon: Icon, color, subtext }) {
  const colorStyles = {
    emerald: { bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
    rose: { bg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400' },
    blue: { bg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' },
    violet: { bg: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' }
  };
  const currentStyle = getMetricStyle(color, colorStyles);

  return (
    <div className="glass-card p-2.5 sm:p-3 rounded-xl flex flex-col gap-0.5 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
      <div className="flex items-center gap-1.5">
        <div className={`p-1 rounded-md ${currentStyle.bg} flex items-center justify-center shrink-0`}>
          <Icon size={13} />
        </div>
        <span className="text-[9.5px] sm:text-[10.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">{title}</span>
      </div>
      <div className="mt-0.5">
        <strong className="text-sm sm:text-lg font-black font-mono tracking-tight text-slate-900 dark:text-white tabular-nums truncate block">{value}</strong>
        {subtext && <p className="text-[9.5px] sm:text-[10px] text-slate-400 dark:text-slate-500 font-medium">{subtext}</p>}
      </div>
    </div>
  );
}

function QuickActions({ activeTransactionType, setActiveTransactionType, onNavigate, onPrint, onBackup }) {
  const { t } = useTranslation();

  return (
    <div className="glass-card dashboard-actions-card">
      <div className="actions-header">
        <span className="actions-title">{t('dashboard.quickActions', 'Quick Actions & Shortcuts')}</span>
      </div>
      <div className="actions-buttons-grid">
        <button
          type="button"
          className={`btn-action btn-action-cash-in ${activeTransactionType === 'cash_in' ? 'active' : ''}`}
          onClick={() => {
            setActiveTransactionType(activeTransactionType === 'cash_in' ? null : 'cash_in');
            onNavigate('cashbook');
          }}
        >
          <ArrowDownLeft size={16} /> <span>{t('dashboard.addCashIn', 'Add Cash In')}</span>
        </button>

        <button
          type="button"
          className={`btn-action btn-action-cash-out ${activeTransactionType === 'cash_out' ? 'active' : ''}`}
          onClick={() => {
            setActiveTransactionType(activeTransactionType === 'cash_out' ? null : 'cash_out');
            onNavigate('cashbook');
          }}
        >
          <ArrowUpRight size={16} /> <span>{t('dashboard.addCashOut', 'Add Cash Out')}</span>
        </button>

        <button
          type="button"
          className="btn-action bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/70 dark:border-indigo-800/70 text-indigo-700 dark:text-indigo-300 font-bold"
          onClick={() => onNavigate('employees')}
        >
          <UsersRound size={16} className="text-indigo-600 dark:text-indigo-400" /> <span>{t('dashboard.employeesSalaries', 'Employees & Salaries')}</span>
        </button>

        <button
          type="button"
          className="btn-action"
          onClick={() => onNavigate('accounts')}
        >
          <Users size={16} /> <span>{t('dashboard.accounts', 'Accounts')}</span>
        </button>

        <button
          type="button"
          className="btn-action"
          onClick={() => onNavigate('ledger')}
        >
          <Landmark size={16} /> <span>{t('dashboard.accountLedger', 'Account Ledger')}</span>
        </button>

        <button
          type="button"
          className="btn-action"
          onClick={() => onNavigate('converter')}
        >
          <RefreshCw size={16} /> <span>{t('dashboard.currencyConverter', 'Currency Converter')}</span>
        </button>

        <button
          type="button"
          className="btn-action"
          onClick={() => onNavigate('reports')}
        >
          <FileText size={16} /> <span>{t('dashboard.financialReports', 'Financial Reports')}</span>
        </button>

        <button
          type="button"
          className="btn-action"
          onClick={onPrint}
        >
          <Printer size={16} /> <span>{t('dashboard.printView', 'Print View')}</span>
        </button>

        <button
          type="button"
          className="btn-action"
          onClick={onBackup}
        >
          <DatabaseBackup size={16} /> <span>{t('dashboard.backupData', 'Backup Data')}</span>
        </button>
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
  const [selectedBranch, setSelectedBranch] = useState('consolidated');
  const displayCompanyName = companyName || companyFallback;
  const userName = currentUser?.full_name || currentUser?.username || 'Ahsanullah';
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
  const currentBalance = summary.afn_balance !== undefined ? Number(summary.afn_balance) : (cashInAfn - cashOutAfn);
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
    <div className="dashboard-page flex flex-col gap-2.5 sm:gap-3.5 w-full pb-16 sm:pb-6">
      {/* 1. Compact Welcome Banner */}
      <div className="dashboard-welcome-card glass-card p-2.5 sm:p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
        <div className="welcome-avatar-block flex items-center gap-2.5">
          <div className="welcome-avatar w-8 h-8 rounded-lg bg-indigo-600 text-white font-black flex items-center justify-center text-xs shadow-2xs shrink-0">
            {userInitials}
          </div>
          <div className="welcome-info min-w-0">
            <p className="text-[10px] text-slate-500 font-medium leading-none">{greeting},</p>
            <h2 className="welcome-greeting text-xs sm:text-base font-black text-slate-900 dark:text-white truncate">{userName}</h2>
            <p className="welcome-subtext text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
              <span className="truncate">{displayCompanyName}</span> &bull; <span className="status-badge-inline text-[9.5px] text-emerald-600 font-bold">{t('dashboard.upToDate', 'Up to date')}</span>
            </p>
          </div>
        </div>

        <div className="welcome-stats flex items-center gap-1.5 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800/80">
          <div className="stat-pill px-2 py-0.5 bg-slate-50 dark:bg-slate-800/60 rounded-md border border-slate-200/60 dark:border-slate-700/60 flex items-center gap-1.5 text-xs">
            <CalendarDays size={12} className="text-indigo-500 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[7.5px] uppercase font-bold text-slate-400">{t('dashboard.today', 'Today')}</span>
              <strong className="text-[10px] font-bold text-slate-800 dark:text-slate-200">{todayCount} entries</strong>
            </div>
          </div>
          <div className="stat-pill px-2 py-0.5 bg-slate-50 dark:bg-slate-800/60 rounded-md border border-slate-200/60 dark:border-slate-700/60 flex items-center gap-1.5 text-xs">
            <CalendarRange size={12} className="text-indigo-500 shrink-0" />
            <div className="flex flex-col">
              <span className="text-[7.5px] uppercase font-bold text-slate-400">{t('dashboard.thisMonth', 'This Month')}</span>
              <strong className="text-[10px] font-bold text-slate-800 dark:text-slate-200">{monthCount} entries</strong>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Primary 4-Card Responsive Metric Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <MetricCard
          title="Total Cash In (AFN)"
          value={currency(cashInAfn, 'AFN')}
          icon={ArrowDownLeft}
          color="emerald"
          subtext={`${totalTxCount} total transactions`}
        />
        <MetricCard
          title="Total Cash Out (AFN)"
          value={currency(cashOutAfn, 'AFN')}
          icon={ArrowUpRight}
          color="rose"
          subtext="Verified accurate balance"
        />
        <MetricCard
          title="Current AFN Balance"
          value={currency(currentBalance, 'AFN')}
          icon={WalletCards}
          color="blue"
          subtext={currentBalance >= 0 ? "Positive Net Balance" : "Negative Net Balance"}
        />
        <MetricCard
          title="Total Transactions"
          value={totalTxCount}
          icon={TrendingUp}
          color="violet"
          subtext="Recorded in database"
        />
      </div>

      {/* 3. Quick Action Buttons */}
      <QuickActions
        activeTransactionType={activeTransactionType}
        setActiveTransactionType={setActiveTransactionType}
        onNavigate={onNavigate}
        onPrint={onPrint}
        onBackup={onBackup}
      />

      {/* 4. Recent Transactions & Cashflow Split */}
      <div className="dashboard-main-split">
        {/* Recent Transactions Card */}
        <div className="recent-transactions-card">
          <div className="card-header flex justify-between items-center">
            <div className="flex items-center gap-2">
              <h3 className="card-title">{t('dashboard.recentTransactions', 'Recent Transactions')}</h3>
              <span className="record-count-badge">{recentTransactions.length} items</span>
            </div>
            <NavLink to="/cashbook" className="view-all-link">
              <span>{t('dashboard.viewAll', 'View all')}</span>
              <ArrowRight size={14} />
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
                  const amount = isCashIn ? tx.cash_in_afn : tx.cash_out_afn;
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
                        {signedCurrency(amount, tx.transaction_type)}
                      </td>
                      <td>
                        <span className="badge-status">
                          <CheckCircle2 size={12} />
                          <span>{t('dashboard.completed', 'Completed')}</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {recentTransactions.length === 0 && (
                  <tr>
                    <td colSpan="5" className="empty-state-cell">
                      {t('dashboard.noTransactions', 'No transactions recorded yet. Click "Add Cash In" or "Add Cash Out" to create an entry.')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View (<760px) */}
          <div className="recent-mobile-cards">
            {recentTransactions.map((tx) => {
              const isCashIn = tx.transaction_type === 'cash_in';
              const amount = isCashIn ? tx.cash_in_afn : tx.cash_out_afn;
              return (
                <div key={tx.id} className="mobile-tx-card">
                  <div className={`mobile-tx-icon ${isCashIn ? 'mobile-tx-icon-in' : 'mobile-tx-icon-out'}`}>
                    {isCashIn ? <ArrowDownLeft size={20} /> : <ArrowUpRight size={20} />}
                  </div>
                  <div className="mobile-tx-info">
                    <span className="mobile-tx-name">{tx.account_name || 'General Account'}</span>
                    <div className="mobile-tx-meta">
                      <span>{dateLabel(tx.date)}</span>
                      {tx.detail && <span>&bull; {tx.detail}</span>}
                    </div>
                  </div>
                  <div className="mobile-tx-amount-block">
                    <span className={`mobile-tx-amount ${isCashIn ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {signedCurrency(amount, tx.transaction_type)}
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${isCashIn ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {isCashIn ? 'Cash In' : 'Cash Out'}
                    </span>
                  </div>
                </div>
              );
            })}
            {recentTransactions.length === 0 && (
              <div className="p-4 text-center text-xs text-slate-500 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-200/50 dark:border-slate-800">
                {t('dashboard.noTransactions', 'No transactions recorded yet.')}
              </div>
            )}
          </div>
        </div>

        {/* Chronological Cash Flow Chart */}
        <div className="glass-card cash-flow-chart-card">
          <div className="card-header">
            <h3 className="card-title">{t('dashboard.cashFlow', 'Chronological Cash Flow')}</h3>
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

