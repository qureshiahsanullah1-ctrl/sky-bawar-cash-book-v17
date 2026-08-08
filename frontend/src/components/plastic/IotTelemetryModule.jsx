import React, { useState, useEffect } from 'react';
import { Activity, Gauge, Zap, AlertTriangle, ShieldCheck, Thermometer } from 'lucide-react';

export default function IotTelemetryModule({ isLight = false }) {
  const [machines, setMachines] = useState([
    { code: 'IMM-250T', name: 'Sumitomo 250T Press', status: 'RUNNING', temp: 215.0, cycle: 14.5, power: 45.0, shots: 185240, oee: 92.4 },
    { code: 'IMM-350T', name: 'KraussMaffei 350T Press', status: 'RUNNING', temp: 220.0, cycle: 18.0, power: 62.0, shots: 142110, oee: 88.6 },
    { code: 'IMM-500T', name: 'Engel duo 500T Press', status: 'PURGING', temp: 230.0, cycle: 22.5, power: 85.0, shots: 98450, oee: 76.2 },
    { code: 'SBM-HUSKY', name: 'Husky Blow Station', status: 'RUNNING', temp: 205.0, cycle: 12.0, power: 55.0, shots: 260890, oee: 94.8 },
  ]);

  // Simulate live WebSocket telemetry pings every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setMachines(prev => prev.map(m => {
        if (m.status === 'RUNNING') {
          const tempVariation = (Math.random() * 1.2 - 0.6);
          const newShots = m.shots + 1;
          return {
            ...m,
            temp: parseFloat((m.temp + tempVariation).toFixed(1)),
            shots: newShots
          };
        }
        return m;
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
      
      {/* Header */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl border shadow-2xs ${
        isLight ? 'bg-white/90 border-slate-200 text-slate-900' : 'bg-slate-900/60 border-white/10 text-white'
      }`}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-500/20 text-indigo-500 border border-indigo-500/30">
            <Activity size={20} className="animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black tracking-tight uppercase flex items-center gap-2">
              <span>Live Factory Floor IoT Telemetry Monitor</span>
            </h2>
            <p className={`text-xs font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Real-time PLC machine telemetry stream tracking temperatures, pressures, power draw, and live OEE performance.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>WebSocket Live</span>
          </span>
        </div>
      </div>

      {/* Machine Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {machines.map((m) => (
          <div key={m.code} className={`p-4 rounded-xl border shadow-2xs space-y-3 relative overflow-hidden group transition-all ${
            isLight ? 'bg-white/90 border-slate-200 text-slate-900 hover:border-cyan-500' : 'bg-slate-900/60 border-white/10 text-white hover:border-cyan-500/40'
          }`}>
            
            <div className="flex items-center justify-between">
              <div>
                <strong className="text-xs font-black block">{m.code}</strong>
                <span className={`text-[10px] font-medium ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{m.name}</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-extrabold uppercase ${
                m.status === 'RUNNING' ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30' :
                m.status === 'PURGING' ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30' :
                'bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/30'
              }`}>
                {m.status}
              </span>
            </div>

            {/* Diagnostics */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className={`p-2 rounded-lg border ${isLight ? 'bg-slate-100/80 border-slate-200' : 'bg-slate-950/60 border-slate-800'}`}>
                <span className={`text-[9.5px] flex items-center gap-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}><Thermometer size={11} /> Temp</span>
                <strong className="text-xs font-mono font-bold">{m.temp}°C</strong>
              </div>

              <div className={`p-2 rounded-lg border ${isLight ? 'bg-slate-100/80 border-slate-200' : 'bg-slate-950/60 border-slate-800'}`}>
                <span className={`text-[9.5px] flex items-center gap-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}><Zap size={11} /> Power</span>
                <strong className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">{m.power} kW</strong>
              </div>
            </div>

            {/* Shots */}
            <div className={`text-xs font-mono flex justify-between pt-1.5 border-t ${isLight ? 'border-slate-200 text-slate-600' : 'border-slate-800 text-slate-400'}`}>
              <span className="text-[11px]">Total Shots Logged:</span>
              <strong className="font-bold">{m.shots.toLocaleString()}</strong>
            </div>

            {/* OEE Progress Bar */}
            <div className="space-y-1 pt-0.5">
              <div className="flex justify-between text-[10.5px] font-bold">
                <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Live OEE:</span>
                <span className="text-cyan-600 dark:text-cyan-400 font-mono">{m.oee}%</span>
              </div>
              <div className={`w-full h-1.5 rounded-full overflow-hidden ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`}>
                <div className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400" style={{ width: `${m.oee}%` }} />
              </div>
            </div>

          </div>
        ))}
      </div>

    </div>
  );
}
