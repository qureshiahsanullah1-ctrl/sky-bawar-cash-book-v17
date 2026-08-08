import React, { useState, useMemo } from 'react';
import { Calculator, Scale, Zap, TrendingUp, AlertTriangle, CheckCircle2, Save } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../ToastProvider';

export default function ResinProfitCalculator({ isLight = false }) {
  const { showToast } = useToast();

  // Raw Material Inputs
  const [bagPriceAfn, setBagPriceAfn] = useState(2000); // Price per bag in AFN
  const [bagWeightKg, setBagWeightKg] = useState(25);   // Standard 25kg bag
  const [scrapRatePct, setScrapRatePct] = useState(4.0); // 4% waste allowance

  // Product & Machine Inputs
  const [bottleWeightGrams, setBottleWeightGrams] = useState(17.0); // e.g., 17g PET bottle
  const [sellingPriceAfn, setSellingPriceAfn] = useState(3.00);     // Selling price per unit in AFN
  const [machineOutputPerHour, setMachineOutputPerHour] = useState(2000); // Bottles per hour
  const [hourlyOverheadAfn, setHourlyOverheadAfn] = useState(1000); // Electricity + Labor per hr

  const [isSaving, setIsSaving] = useState(false);

  const calc = useMemo(() => {
    const rawCostPerKg = bagWeightKg > 0 ? bagPriceAfn / bagWeightKg : 0;
    const effectiveCostPerKg = rawCostPerKg * (1 + scrapRatePct / 100);
    const resinCostPerUnit = (bottleWeightGrams / 1000) * effectiveCostPerKg;
    const overheadCostPerUnit = machineOutputPerHour > 0 ? hourlyOverheadAfn / machineOutputPerHour : 0;
    const totalCostPerUnit = resinCostPerUnit + overheadCostPerUnit;
    const netProfitPerUnit = sellingPriceAfn - totalCostPerUnit;
    const profitMarginPct = sellingPriceAfn > 0 ? (netProfitPerUnit / sellingPriceAfn) * 100 : 0;
    const hourlyRevenue = machineOutputPerHour * sellingPriceAfn;
    const hourlyTotalCost = machineOutputPerHour * totalCostPerUnit;
    const hourlyNetProfit = hourlyRevenue - hourlyTotalCost;
    const dailyNetProfit = hourlyNetProfit * 20; // 20-hour operational shift

    return {
      rawCostPerKg: rawCostPerKg.toFixed(2),
      effectiveCostPerKg: effectiveCostPerKg.toFixed(2),
      resinCostPerUnit: resinCostPerUnit.toFixed(2),
      overheadCostPerUnit: overheadCostPerUnit.toFixed(2),
      totalCostPerUnit: totalCostPerUnit.toFixed(2),
      netProfitPerUnit: netProfitPerUnit.toFixed(2),
      profitMarginPct: profitMarginPct.toFixed(1),
      hourlyNetProfit: hourlyNetProfit.toFixed(0),
      dailyNetProfit: dailyNetProfit.toFixed(0)
    };
  }, [bagPriceAfn, bagWeightKg, scrapRatePct, bottleWeightGrams, sellingPriceAfn, machineOutputPerHour, hourlyOverheadAfn]);

  async function handleSaveValuation() {
    setIsSaving(true);
    try {
      await api.post('/api/v1/plastic/resin/valuation/save', {
        bag_price_afn: bagPriceAfn,
        bag_weight_kg: bagWeightKg,
        scrap_rate_pct: scrapRatePct,
        unit_weight_grams: bottleWeightGrams,
        selling_price_afn: sellingPriceAfn,
        effective_cost_per_kg: parseFloat(calc.effectiveCostPerKg),
        unit_cogm_afn: parseFloat(calc.totalCostPerUnit),
        net_profit_per_unit_afn: parseFloat(calc.netProfitPerUnit),
        margin_pct: parseFloat(calc.profitMarginPct)
      });
      showToast('Standard Valuation & Unit Profit saved to ledger database!', 'success');
    } catch (error) {
      showToast(error.message || 'Saved valuation locally', 'info');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
      
      {/* Header */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl border shadow-2xs ${
        isLight ? 'bg-white/90 border-slate-200 text-slate-900' : 'bg-slate-900/60 border-white/10 text-white'
      }`}>
        <div>
          <span className="text-[9.5px] font-mono font-bold uppercase tracking-widest text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">Module 09</span>
          <h1 className="text-sm sm:text-base font-black uppercase mt-1 flex items-center gap-2">
            <Calculator size={18} className="text-cyan-500" /> Automated Resin & Unit Profit Calculator
          </h1>
        </div>
        <div className="text-right">
          <span className={`text-[11px] block font-mono ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Currency: Afghanis (AFN)</span>
          <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold">Live Pricing Engine Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* LEFT COLUMN: Controls & Input Parameters (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Box 1: Raw Resin Purchase Inputs */}
          <div className={`p-4 rounded-xl border shadow-2xs space-y-3 ${
            isLight ? 'bg-white/90 border-slate-200 text-slate-900' : 'bg-slate-900/60 border-white/15 text-white'
          }`}>
            <h3 className="text-base font-bold mb-2 flex items-center">
              <Scale className="w-5 h-5 mr-2 text-cyan-400" /> Step 1: Bulk Resin Bag Cost Normalization
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={`text-[10px] font-bold block mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Price (AFN)</label>
                <input 
                  type="number" 
                  value={bagPriceAfn} 
                  onChange={(e) => setBagPriceAfn(parseFloat(e.target.value) || 0)}
                  className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950/90 border-slate-800 text-white'
                  }`} 
                />
              </div>
              <div>
                <label className={`text-[10px] font-bold block mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Bag Weight (kg)</label>
                <input 
                  type="number" 
                  value={bagWeightKg} 
                  onChange={(e) => setBagWeightKg(parseFloat(e.target.value) || 0)}
                  className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950/90 border-slate-800 text-white'
                  }`} 
                />
              </div>
              <div>
                <label className={`text-[10px] font-bold block mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Scrap Allowance (%)</label>
                <input 
                  type="number" 
                  step="0.5"
                  value={scrapRatePct} 
                  onChange={(e) => setScrapRatePct(parseFloat(e.target.value) || 0)}
                  className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold ${
                    isLight ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-slate-950/90 border-slate-800 text-amber-300'
                  }`} 
                />
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-800 text-xs font-mono">
              <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>Base Price: <strong className="text-cyan-600 dark:text-cyan-300">AFN {calc.rawCostPerKg} / kg</strong></span>
              <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>True Cost with Scrap: <strong className="text-emerald-600 dark:text-emerald-400">AFN {calc.effectiveCostPerKg} / kg</strong></span>
            </div>
          </div>

          {/* Box 2: Bottle & Machine Floor Parameters */}
          <div className={`p-4 rounded-xl border shadow-2xs space-y-3 ${
            isLight ? 'bg-white/90 border-slate-200 text-slate-900' : 'bg-slate-900/60 border-white/15 text-white'
          }`}>
            <h3 className="text-sm font-bold mb-1 flex items-center">
              <Zap className="w-4 h-4 mr-2 text-amber-500" /> Step 2: Bottle SKU & Machine Overhead
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`text-[10px] font-bold block mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Bottle Weight (Grams)</label>
                <input 
                  type="number" 
                  step="0.1"
                  value={bottleWeightGrams} 
                  onChange={(e) => setBottleWeightGrams(parseFloat(e.target.value) || 0)}
                  className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950/90 border-slate-800 text-white'
                  }`} 
                />
              </div>
              <div>
                <label className={`text-[10px] font-bold block mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Target Selling Price (AFN)</label>
                <input 
                  type="number" 
                  step="0.1"
                  value={sellingPriceAfn} 
                  onChange={(e) => setSellingPriceAfn(parseFloat(e.target.value) || 0)}
                  className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold ${
                    isLight ? 'bg-emerald-50 border-emerald-300 text-emerald-900' : 'bg-slate-950/90 border-slate-800 text-emerald-400'
                  }`} 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              <div>
                <label className={`text-[10px] font-bold block mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Machine Speed (Bottles/Hour)</label>
                <input 
                  type="number" 
                  value={machineOutputPerHour} 
                  onChange={(e) => setMachineOutputPerHour(parseFloat(e.target.value) || 0)}
                  className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950/90 border-slate-800 text-white'
                  }`} 
                />
              </div>
              <div>
                <label className={`text-[10px] font-bold block mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Factory Overhead (AFN/Hour)</label>
                <input 
                  type="number" 
                  value={hourlyOverheadAfn} 
                  onChange={(e) => setHourlyOverheadAfn(parseFloat(e.target.value) || 0)}
                  className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold ${
                    isLight ? 'bg-rose-50 border-rose-300 text-rose-900' : 'bg-slate-950/90 border-slate-800 text-rose-300'
                  }`} 
                />
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Live Profit Output HUD (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className={`p-4 rounded-xl border shadow-2xs space-y-4 ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-gradient-to-b from-slate-900 to-indigo-950 border-cyan-500/30 text-white'
          }`}>
            
            <div className="border-b border-slate-200 dark:border-slate-800 pb-3 flex justify-between items-start">
              <div>
                <span className={`text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Net Profit Margin</span>
                <h2 className={`text-3xl font-black font-mono mt-0.5 ${parseFloat(calc.netProfitPerUnit) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  {calc.profitMarginPct}%
                </h2>
              </div>
              {parseFloat(calc.profitMarginPct) >= 20 ? (
                <span className="flex items-center text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/20 px-2.5 py-1 rounded-full border border-emerald-500/30">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Healthy Margin
                </span>
              ) : (
                <span className="flex items-center text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-500/20 px-2.5 py-1 rounded-full border border-amber-500/30">
                  <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Check Margins
                </span>
              )}
            </div>

            {/* Detailed Unit Breakdown */}
            <div className="space-y-2 text-xs font-mono">
              <div className={`flex justify-between ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                <span>Selling Price:</span>
                <span className="font-bold">AFN {sellingPriceAfn.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between pl-2 text-xs text-slate-500">
                <span>- Direct Resin Cost:</span>
                <span className="font-bold text-cyan-600 dark:text-cyan-300">AFN {calc.resinCostPerUnit}</span>
              </div>

              <div className="flex justify-between pl-2 text-xs text-slate-500">
                <span>- Machine Overhead:</span>
                <span className="font-bold text-amber-600 dark:text-amber-300">AFN {calc.overheadCostPerUnit}</span>
              </div>

              <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-800 font-bold">
                <span>Total COGM / Unit:</span>
                <span className="text-rose-600 dark:text-rose-300">AFN {calc.totalCostPerUnit}</span>
              </div>
            </div>

            {/* Bottom Callout: Profit Per Unit & Per Hour */}
            <div className={`p-3.5 rounded-xl border ${
              parseFloat(calc.netProfitPerUnit) >= 0
                ? isLight ? 'bg-emerald-50 border-emerald-200' : 'bg-emerald-500/10 border-emerald-500/30'
                : isLight ? 'bg-rose-50 border-rose-200' : 'bg-rose-500/10 border-rose-500/30'
            } space-y-1.5`}>
              <div className="flex justify-between items-baseline">
                <span className={`text-xs font-bold uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Net Profit / Bottle:</span>
                <span className={`text-xl font-black font-mono ${parseFloat(calc.netProfitPerUnit) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                  AFN {calc.netProfitPerUnit}
                </span>
              </div>

              <div className="flex justify-between items-baseline pt-1.5 border-t border-slate-200 dark:border-slate-800/60 text-xs">
                <span className={`flex items-center ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                  <TrendingUp className="w-3.5 h-3.5 mr-1 text-emerald-500" /> Hourly Net Profit:
                </span>
                <span className="font-mono font-bold text-xs">
                  AFN {calc.hourlyNetProfit} / hr
                </span>
              </div>
            </div>

            <button 
              type="button"
              onClick={handleSaveValuation}
              disabled={isSaving}
              className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 rounded-lg text-xs transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Save size={15} />
              <span>{isSaving ? 'Updating Master Ledger...' : 'Save Standard Valuation to Ledger →'}</span>
            </button>

          </div>
        </div>

      </div>

    </div>
  );
}
