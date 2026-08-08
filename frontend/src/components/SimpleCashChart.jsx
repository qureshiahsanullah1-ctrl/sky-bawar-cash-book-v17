import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { currency } from '../utils/format';

export default function SimpleCashChart({ transactions }) {
  const chartData = useMemo(() => {
    const monthlyData = {};
    
    // Sort transactions chronologically
    const sortedTx = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
    
    sortedTx.forEach(tx => {
      if (!tx.date) return;
      const monthKey = tx.date.slice(0, 7); // YYYY-MM
      
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          'Cash In': 0,
          'Cash Out': 0,
        };
      }
      
      const inVal = Number(tx.cash_in_afn || 0);
      const outVal = Number(tx.cash_out_afn || 0);
      
      monthlyData[monthKey]['Cash In'] += inVal;
      monthlyData[monthKey]['Cash Out'] += outVal;
    });
    
    return Object.values(monthlyData)
      .map(item => {
        const [year, month] = item.month.split('-');
        const date = new Date(year, parseInt(month) - 1, 1);
        const name = date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        return {
          ...item,
          name,
        };
      })
      .slice(-6); // show last 6 active months
  }, [transactions]);

  if (!transactions || transactions.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-zinc-500 text-sm">
        No transaction history available to generate trends.
      </div>
    );
  }

  return (
    <div className="w-full h-56 p-2.5 rounded-xl bg-slate-100/60 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md shadow-inner transition-all">
      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100 mb-1 flex items-center gap-2">
        <span>Monthly Cash Flow Trends (AFN)</span>
      </h4>
      <ResponsiveContainer width="100%" height="86%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(120, 120, 120, 0.1)" />
          <XAxis 
            dataKey="name" 
            tickLine={false} 
            axisLine={false}
            tick={{ fill: 'var(--text-soft)', fontSize: 11 }}
          />
          <YAxis 
            tickLine={false} 
            axisLine={false}
            tick={{ fill: 'var(--text-soft)', fontSize: 11 }}
            tickFormatter={(v) => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
          />
          <Tooltip 
            contentStyle={{ 
              background: 'var(--surface)', 
              borderColor: 'var(--border)', 
              borderRadius: '8px',
              color: 'var(--text)',
              fontSize: '12px'
            }}
            formatter={(value) => [currency(value), '']}
          />
          <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} />
          <Area 
            type="monotone" 
            dataKey="Cash In" 
            stroke="#10b981" 
            fillOpacity={1} 
            fill="url(#colorIn)" 
            strokeWidth={2}
          />
          <Area 
            type="monotone" 
            dataKey="Cash Out" 
            stroke="#ef4444" 
            fillOpacity={1} 
            fill="url(#colorOut)" 
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
