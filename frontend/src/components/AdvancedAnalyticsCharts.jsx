import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { currency } from '../utils/format';

export default function AdvancedAnalyticsCharts({ transactions = [], summary = {} }) {
  const { t } = useTranslation();

  // 1. Pie Chart Data (Income vs Expense)
  const pieData = useMemo(() => {
    let income = 0;
    let expense = 0;

    // Use backend summary if available and accurate
    if (summary.cash_in_afn && summary.cash_out_afn) {
      income = Number(summary.cash_in_afn);
      expense = Number(summary.cash_out_afn);
    } else {
      // Calculate manually from transactions
      transactions.forEach(tx => {
        if (tx.transaction_type === 'cash_in') {
          income += Number(tx.cash_in_afn || 0);
        } else if (tx.transaction_type === 'cash_out') {
          expense += Number(tx.cash_out_afn || 0);
        }
      });
    }

    return [
      { name: t('dashboard.income', 'Income'), value: income, color: '#10b981' }, // emerald-500
      { name: t('dashboard.expense', 'Expense'), value: expense, color: '#f43f5e' } // rose-500
    ].filter(d => d.value > 0);
  }, [transactions, summary, t]);

  // 2. Bar Chart Data (Monthly Net Profits)
  const monthlyData = useMemo(() => {
    const months = {};
    
    transactions.forEach(tx => {
      if (!tx.date) return;
      const monthKey = tx.date.slice(0, 7); // YYYY-MM
      if (!months[monthKey]) {
        months[monthKey] = { income: 0, expense: 0, net: 0, name: monthKey };
      }
      
      if (tx.transaction_type === 'cash_in') {
        months[monthKey].income += Number(tx.cash_in_afn || 0);
      } else if (tx.transaction_type === 'cash_out') {
        months[monthKey].expense += Number(tx.cash_out_afn || 0);
      }
    });

    const sortedMonths = Object.keys(months).sort();
    
    // Take the last 6 months for the chart
    const recentMonths = sortedMonths.slice(-6);

    return recentMonths.map(key => {
      const data = months[key];
      data.net = data.income - data.expense;
      // Format month name (e.g., '2023-10' -> 'Oct')
      const d = new Date(key + '-01');
      data.displayName = d.toLocaleDateString(undefined, { month: 'short' });
      return data;
    });
  }, [transactions]);

  const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 p-3 rounded-lg shadow-xl shadow-black/5">
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">{payload[0].name}</p>
          <p className="text-sm font-mono text-slate-600 dark:text-slate-400">
            {currency(payload[0].value, 'AFN')}
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomBarTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 p-3 rounded-lg shadow-xl shadow-black/5">
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2 border-b border-slate-100 dark:border-slate-800 pb-1">{label}</p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2 mb-1 text-xs">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-slate-500 uppercase font-semibold">{entry.name}:</span>
              <span className="font-mono font-bold text-slate-700 dark:text-slate-300 ml-auto">
                {currency(entry.value, '')}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (!transactions.length) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
      {/* Pie Chart Card */}
      <div className="glass-card p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4">{t('dashboard.incomeVsExpense', 'Income vs Expense')}</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomPieTooltip />} />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bar Chart Card */}
      <div className="glass-card p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4">{t('dashboard.monthlyNet', 'Monthly Net Profit')}</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={monthlyData}
              margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
              <XAxis dataKey="displayName" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
              <YAxis hide={true} />
              <Tooltip content={<CustomBarTooltip />} cursor={{ fill: 'rgba(203, 213, 225, 0.15)' }} />
              <Legend verticalAlign="bottom" height={36} iconType="circle" />
              <Bar dataKey="income" name={t('dashboard.income', 'Income')} fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
              <Bar dataKey="expense" name={t('dashboard.expense', 'Expense')} fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
