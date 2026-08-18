import React, { useEffect, useState } from 'react';
import { Activity, ArrowDownRight, ArrowUpRight, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { useTenant } from '../context/CompanyContext';
import { api } from '../services/api';

export function DashboardMetrics() {
  const { activeCompany } = useTenant();
  const [metrics, setMetrics] = useState({
    afnBalance: 0,
    usdBalance: 0,
    todayTxCount: 0,
    cashIn: 0,
    cashOut: 0,
    monthNet: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      setLoading(true);
      try {
        const summaryData = await api.getSummary();
        setMetrics({
          afnBalance: summaryData?.afn_balance || 0,
          usdBalance: summaryData?.usd_balance || 0,
          todayTxCount: summaryData?.today_transactions || 0,
          cashIn: summaryData?.cash_in_afn || 0,
          cashOut: summaryData?.cash_out_afn || 0,
          monthNet: (summaryData?.cash_in_afn || 0) - (summaryData?.cash_out_afn || 0)
        });
      } catch (error) {
        console.error("Failed to load metrics:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [activeCompany?.id]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6 animate-pulse">
        <div className="h-28 bg-slate-200 dark:bg-slate-800/60 rounded-2xl border border-slate-300/40 dark:border-slate-700/50" />
        <div className="h-28 bg-slate-200 dark:bg-slate-800/60 rounded-2xl border border-slate-300/40 dark:border-slate-700/50" />
        <div className="h-28 bg-slate-200 dark:bg-slate-800/60 rounded-2xl border border-slate-300/40 dark:border-slate-700/50" />
      </div>
    );
  }

  const isUsdPrimary = activeCompany?.currency === 'USD';
  const primaryBalance = isUsdPrimary ? metrics.usdBalance : metrics.afnBalance;
  const secondaryBalance = isUsdPrimary ? metrics.afnBalance : metrics.usdBalance;
  const currencySymbol = activeCompany?.currency || 'AFN';
  const secondarySymbol = isUsdPrimary ? 'AFN' : 'USD';

  const cashFlowHealthRatio = metrics.cashIn + metrics.cashOut > 0
    ? Math.round((metrics.cashIn / (metrics.cashIn + metrics.cashOut)) * 100)
    : 100;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
      {/* Primary & Dual Currency Reserve Card (Champagne Gold Accent) */}
      <div className="relative overflow-hidden p-5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-lg shadow-slate-950/5 hover:-translate-y-1 transition-all duration-300 group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 dark:bg-amber-400/10 rounded-full blur-2xl group-hover:scale-125 transition-transform" />
        <div className="flex items-center justify-between relative z-10">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {currencySymbol} Primary Reserve
          </span>
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 dark:bg-amber-400/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
            <Wallet size={18} />
          </div>
        </div>
        <h2 className="text-2.5xl font-black mt-2 text-slate-900 dark:text-white font-mono tracking-tight relative z-10">
          {currencySymbol} {primaryBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </h2>
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/80 text-xs relative z-10">
          <div className="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400">
            <ArrowUpRight size={14} />
            <span>Active Ledger</span>
          </div>
          <span className="font-mono font-bold text-slate-500 dark:text-slate-400">
            {secondarySymbol}: {secondaryBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Today's Activity & Health Ratio Card */}
      <div className="relative overflow-hidden p-5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-lg shadow-slate-950/5 hover:-translate-y-1 transition-all duration-300 group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 dark:bg-emerald-400/10 rounded-full blur-2xl group-hover:scale-125 transition-transform" />
        <div className="flex items-center justify-between relative z-10">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Today's Flow ({cashFlowHealthRatio}% Inflow)
          </span>
          <span className="inline-flex items-center gap-1 text-xs bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg font-mono font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <Activity size={12} className="text-emerald-500" />
            {metrics.todayTxCount} TX
          </span>
        </div>
        <div className="flex items-center justify-between mt-3 relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
              <ArrowUpRight size={14} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Cash In</span>
              <span className="text-sm font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                +{metrics.cashIn.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-500">
              <ArrowDownRight size={14} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Cash Out</span>
              <span className="text-sm font-extrabold font-mono text-rose-600 dark:text-rose-400">
                -{metrics.cashOut.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Net Performance Card */}
      <div className="relative overflow-hidden p-5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-lg shadow-slate-950/5 hover:-translate-y-1 transition-all duration-300 group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 dark:bg-amber-400/10 rounded-full blur-2xl group-hover:scale-125 transition-transform" />
        <div className="flex items-center justify-between relative z-10">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Monthly Net Performance
          </span>
          <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shadow-sm ${metrics.monthNet >= 0 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-rose-500/10 border-rose-500/30 text-rose-500'}`}>
            {metrics.monthNet >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
          </div>
        </div>
        <h3 className={`text-2.5xl font-black mt-2 font-mono tracking-tight relative z-10 ${metrics.monthNet >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
          {metrics.monthNet >= 0 ? '+' : ''}{currencySymbol} {metrics.monthNet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </h3>
        <span className="text-xs font-semibold text-slate-400 mt-1 block relative z-10">Net balance variation</span>
      </div>
    </div>
  );
}

export default DashboardMetrics;

