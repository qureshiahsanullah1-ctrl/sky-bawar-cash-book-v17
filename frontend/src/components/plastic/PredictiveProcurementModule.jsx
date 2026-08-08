import React, { useState } from 'react';
import { ShoppingCart, AlertOctagon, CheckCircle2, ArrowRight } from 'lucide-react';
import { useToast } from '../ToastProvider';

export default function PredictiveProcurementModule({ isLight = false }) {
  const { showToast } = useToast();
  const [materials, setMaterials] = useState([
    { code: 'RM-PP-VIRGIN', name: 'Polypropylene (PP) Virgin Resin', type: 'PP', stock_kg: 18500, daily_burn: 350, days_left: 52.8, rop: 3450, status: 'OK', eoq: 15750 },
    { code: 'RM-HDPE', name: 'High-Density Polyethylene (HDPE)', type: 'HDPE', stock_kg: 2400, daily_burn: 350, days_left: 6.8, rop: 4300, status: 'REORDER_NOW', eoq: 15750 },
    { code: 'RM-PVC', name: 'Polyvinyl Chloride Compound', type: 'PVC', stock_kg: 8500, daily_burn: 120, days_left: 70.8, rop: 2180, status: 'OK', eoq: 5400 },
    { code: 'RM-COLOR-RED', name: 'Masterbatch Red Colorant', type: 'PP', stock_kg: 120, daily_burn: 25, days_left: 4.8, rop: 175, status: 'CRITICAL_STOCKOUT', eoq: 1125 },
  ]);

  function handleDispatchPO(mat) {
    showToast(`Dispatched Auto-PO to supplier for ${mat.eoq} kg of ${mat.code}!`, 'success');
    setMaterials(prev => prev.map(m => m.code === mat.code ? { ...m, status: 'PO_DISPATCHED' } : m));
  }

  return (
    <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
      
      {/* Header */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl border shadow-2xs ${
        isLight ? 'bg-white/90 border-slate-200 text-slate-900' : 'bg-slate-900/60 border-white/10 text-white'
      }`}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-500/20 text-amber-500 border border-amber-500/30">
            <ShoppingCart size={20} />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black tracking-tight uppercase flex items-center gap-2">
              <span>Predictive Procurement & Silo Runway Suite</span>
            </h2>
            <p className={`text-xs font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Calculate Reorder Points (ROP) and Economic Order Quantity (EOQ) targeting 45 days of supply to prevent stockouts.
            </p>
          </div>
        </div>
      </div>

      {/* Runway Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {materials.map((mat) => (
          <div key={mat.code} className={`p-4 rounded-xl border shadow-2xs space-y-3 ${
            isLight ? 'bg-white/90 border-slate-200 text-slate-900' : 'bg-slate-900/60 border-white/10 text-white'
          }`}>
            
            <div className="flex items-start justify-between">
              <div>
                <strong className="text-xs sm:text-sm font-black block">{mat.name}</strong>
                <span className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400">{mat.code} • Polymer: {mat.type}</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[9.5px] font-extrabold uppercase ${
                mat.status === 'OK' ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30' :
                mat.status === 'REORDER_NOW' ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 animate-pulse' :
                mat.status === 'CRITICAL_STOCKOUT' ? 'bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/30 animate-bounce' :
                'bg-blue-500/20 text-blue-700 dark:text-blue-400 border border-blue-500/30'
              }`}>
                {mat.status}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className={`p-2 rounded-lg border ${isLight ? 'bg-slate-100/80 border-slate-200' : 'bg-slate-950/60 border-slate-800'}`}>
                <span className={`text-[9.5px] block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Current Stock</span>
                <strong className="text-xs font-mono font-bold">{mat.stock_kg.toLocaleString()} kg</strong>
              </div>

              <div className={`p-2 rounded-lg border ${isLight ? 'bg-slate-100/80 border-slate-200' : 'bg-slate-950/60 border-slate-800'}`}>
                <span className={`text-[9.5px] block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Stockout Runway</span>
                <strong className={`text-xs font-mono font-bold ${mat.days_left < 10 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>{mat.days_left} Days</strong>
              </div>

              <div className={`p-2 rounded-lg border ${isLight ? 'bg-slate-100/80 border-slate-200' : 'bg-slate-950/60 border-slate-800'}`}>
                <span className={`text-[9.5px] block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>EOQ Target PO</span>
                <strong className="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">{mat.eoq.toLocaleString()} kg</strong>
              </div>
            </div>

            {/* Action Trigger */}
            <div className="pt-1 flex justify-end">
              <button
                type="button"
                onClick={() => handleDispatchPO(mat)}
                disabled={mat.status === 'PO_DISPATCHED'}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-lg shadow-2xs transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
              >
                <span>{mat.status === 'PO_DISPATCHED' ? 'PO Dispatched to Supplier' : `Dispatch PO (${mat.eoq} kg)`}</span>
                <ArrowRight size={13} />
              </button>
            </div>

          </div>
        ))}
      </div>

    </div>
  );
}
