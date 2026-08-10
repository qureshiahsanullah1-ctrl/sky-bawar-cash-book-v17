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
  const currencySymbol = activeCompany?.currency || 'AFN';

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
      {/* Primary Balance Card */}
      <div className="relative overflow-hidden p-5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-lg shadow-slate-950/5 hover:-translate-y-1 transition-all duration-300 group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 dark:bg-sky-400/10 rounded-full blur-2xl group-hover:scale-125 transition-transform" />
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {currencySymbol} Active Reserve
          </span>
          <div className="w-9 h-9 rounded-xl bg-sky-500/10 dark:bg-sky-400/15 border border-sky-500/30 flex items-center justify-center text-sky-600 dark:text-sky-400">
            <Wallet size={18} />
          </div>
        </div>
        <h2 className="text-2.5xl font-black mt-2 text-slate-900 dark:text-white font-mono tracking-tight">
          {currencySymbol} {primaryBalance.toLocaleString()}
        </h2>
        <div className="flex items-center gap-1.5 mt-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
          <ArrowUpRight size={14} />
          <span>Real-time balance verified</span>
        </div>
      </div>

      {/* Today's Activity Card */}
      <div className="relative overflow-hidden p-5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-lg shadow-slate-950/5 hover:-translate-y-1 transition-all duration-300 group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 dark:bg-emerald-400/10 rounded-full blur-2xl group-hover:scale-125 transition-transform" />
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Today's Flow
          </span>
          <span className="inline-flex items-center gap-1 text-xs bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg font-mono font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <Activity size={12} className="text-sky-500" />
            {metrics.todayTxCount} TX
          </span>
        </div>
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
              <ArrowUpRight size={14} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-slate-400 block">Cash In</span>
              <span className="text-sm font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                +{metrics.cashIn.toLocaleString()}
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
                -{metrics.cashOut.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Net Flow Card */}
      <div className="relative overflow-hidden p-5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-lg shadow-slate-950/5 hover:-translate-y-1 transition-all duration-300 group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 dark:bg-amber-400/10 rounded-full blur-2xl group-hover:scale-125 transition-transform" />
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Monthly Net Performance
          </span>
          <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${metrics.monthNet >= 0 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-rose-500/10 border-rose-500/30 text-rose-500'}`}>
            {metrics.monthNet >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
          </div>
        </div>
        <h3 className={`text-2.5xl font-black mt-2 font-mono tracking-tight ${metrics.monthNet >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
          {metrics.monthNet >= 0 ? '+' : ''}{currencySymbol} {metrics.monthNet.toLocaleString()}
        </h3>
        <span className="text-xs font-semibold text-slate-400 mt-1 block">Net balance variation</span>
      </div>
    </div>
  );
}

export default DashboardMetrics;

