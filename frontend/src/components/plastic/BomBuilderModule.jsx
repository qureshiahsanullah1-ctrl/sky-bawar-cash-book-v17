import React, { useState, useMemo } from 'react';
import { Layers, Sliders, Zap, DollarSign, Calculator, ArrowUpRight, CheckCircle2 } from 'lucide-react';

export default function BomBuilderModule({ isLight = false }) {
  const [unitWeightG, setUnitWeightG] = useState(45.0);
  const [regrindPct, setRegrindPct] = useState(15.0);
  const [virginPrice, setVirginPrice] = useState(1.80);
  const [regrindPrice, setRegrindPrice] = useState(0.90);
  const [cycleTimeSec, setCycleTimeSec] = useState(14.5);
  const [scrapPercent, setScrapPercent] = useState(4.0);
  const [powerKw, setPowerKw] = useState(45.0);
  const [costPerKwh, setCostPerKwh] = useState(0.12);
  const [hourlyOverhead, setHourlyOverhead] = useState(18.50);
  const [operatorWage, setOperatorWage] = useState(15.00);

  const calc = useMemo(() => {
    const partsPerHour = cycleTimeSec > 0 ? (3600.0 / cycleTimeSec) : 240.0;
    const weightKg = unitWeightG / 1000.0;
    const scrapMultiplier = 1.0 + (scrapPercent / 100.0);
    const effectiveWeightKg = weightKg * scrapMultiplier;

    const regrindRatio = regrindPct / 100.0;
    const virginRatio = 1.0 - regrindRatio;
    const blendedPricePerKg = (virginRatio * virginPrice) + (regrindRatio * regrindPrice);

    const materialCostPerUnit = effectiveWeightKg * blendedPricePerKg;
    const scrappedWeightKg = weightKg * (scrapPercent / 100.0);
    const scrapSalvageCredit = scrappedWeightKg * regrindPrice;

    const powerCostPerHour = powerKw * costPerKwh;
    const totalHourlyBurn = powerCostPerHour + hourlyOverhead + operatorWage;

    const machineCostPerUnit = powerCostPerHour / partsPerHour;
    const overheadCostPerUnit = hourlyOverhead / partsPerHour;
    const laborCostPerUnit = operatorWage / partsPerHour;

    const unitCogm = materialCostPerUnit + machineCostPerUnit + overheadCostPerUnit + laborCostPerUnit - scrapSalvageCredit;
    const suggestedPrice = unitCogm * 2.0;
    const grossMargin = suggestedPrice > 0 ? ((suggestedPrice - unitCogm) / suggestedPrice * 100.0) : 50.0;

    return {
      partsPerHour: partsPerHour.toFixed(0),
      materialCostPerUnit: materialCostPerUnit.toFixed(4),
      machineCostPerUnit: machineCostPerUnit.toFixed(4),
      laborCostPerUnit: laborCostPerUnit.toFixed(4),
      overheadCostPerUnit: overheadCostPerUnit.toFixed(4),
      scrapSalvageCredit: scrapSalvageCredit.toFixed(4),
      unitCogm: unitCogm.toFixed(4),
      totalHourlyBurn: totalHourlyBurn.toFixed(2),
      suggestedPrice: suggestedPrice.toFixed(4),
      grossMargin: grossMargin.toFixed(1)
    };
  }, [unitWeightG, regrindPct, virginPrice, regrindPrice, cycleTimeSec, scrapPercent, powerKw, costPerKwh, hourlyOverhead, operatorWage]);

  return (
    <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
      
      {/* Header */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl border shadow-2xs ${
        isLight ? 'bg-white/90 border-slate-200 text-slate-900' : 'bg-slate-900/60 border-white/10 text-white'
      }`}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
            <Sliders size={20} />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black tracking-tight uppercase flex items-center gap-2">
              <span>Interactive BOM Recipe Sandbox</span>
            </h2>
            <p className={`text-xs font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Fine-tune virgin vs regrind polymer ratios, cycle times, and machine burn rates to optimize per-unit COGM.
            </p>
          </div>
        </div>

        <div className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg border ${
          isLight ? 'bg-amber-50 border-amber-200 text-slate-900' : 'bg-slate-950/80 border-slate-800 text-white'
        }`}>
          <Zap size={16} className="text-amber-500 animate-pulse" />
          <div>
            <span className="text-[9.5px] font-bold uppercase text-slate-500 dark:text-slate-400 block leading-tight">Live Burn Rate</span>
            <strong className="text-xs font-mono font-black text-amber-600 dark:text-amber-400">${calc.totalHourlyBurn} / hr</strong>
          </div>
        </div>
      </div>

      {/* Grid Controls & Live KPI */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Controls Column */}
        <div className={`lg:col-span-2 space-y-3 p-4 rounded-xl border shadow-2xs ${
          isLight ? 'bg-white/90 border-slate-200 text-slate-900' : 'bg-slate-900/60 border-white/10 text-white'
        }`}>
          <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
            <Calculator size={15} />
            <span>Recipe Parameters & Resin Pricing</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <label className={`block font-medium mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Part Unit Weight: <strong className={isLight ? 'text-slate-900' : 'text-white'}>{unitWeightG}g</strong></label>
              <input type="range" min="10" max="250" step="1" value={unitWeightG} onChange={(e) => setUnitWeightG(parseFloat(e.target.value))} className="w-full accent-cyan-500" />
            </div>

            <div>
              <label className={`block font-medium mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Regrind Resin Blend: <strong className="text-emerald-600 dark:text-emerald-400">{regrindPct}% Regrind</strong></label>
              <input type="range" min="0" max="50" step="1" value={regrindPct} onChange={(e) => setRegrindPct(parseFloat(e.target.value))} className="w-full accent-emerald-500" />
            </div>

            <div>
              <label className={`block font-medium mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Virgin Resin Price ($/kg)</label>
              <input type="number" step="0.05" value={virginPrice} onChange={(e) => setVirginPrice(parseFloat(e.target.value))} className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold ${
                isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
              }`} />
            </div>

            <div>
              <label className={`block font-medium mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Regrind Salvage Price ($/kg)</label>
              <input type="number" step="0.05" value={regrindPrice} onChange={(e) => setRegrindPrice(parseFloat(e.target.value))} className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold ${
                isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
              }`} />
            </div>

            <div>
              <label className={`block font-medium mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Mold Cycle Time: <strong className={isLight ? 'text-slate-900' : 'text-white'}>{cycleTimeSec}s ({calc.partsPerHour} parts/hr)</strong></label>
              <input type="range" min="5" max="60" step="0.5" value={cycleTimeSec} onChange={(e) => setCycleTimeSec(parseFloat(e.target.value))} className="w-full accent-cyan-500" />
            </div>

            <div>
              <label className={`block font-medium mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Expected Scrap Rate: <strong className="text-rose-600 dark:text-rose-400">{scrapPercent}%</strong></label>
              <input type="range" min="1" max="15" step="0.5" value={scrapPercent} onChange={(e) => setScrapPercent(parseFloat(e.target.value))} className="w-full accent-rose-500" />
            </div>

            <div>
              <label className={`block font-medium mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Machine Power Draw (kW)</label>
              <input type="number" value={powerKw} onChange={(e) => setPowerKw(parseFloat(e.target.value))} className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold ${
                isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
              }`} />
            </div>

            <div>
              <label className={`block font-medium mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Operator Hourly Wage ($/hr)</label>
              <input type="number" value={operatorWage} onChange={(e) => setOperatorWage(parseFloat(e.target.value))} className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold ${
                isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-white'
              }`} />
            </div>
          </div>
        </div>

        {/* Live COGM Summary Card */}
        <div className={`p-4 rounded-xl border shadow-2xs flex flex-col justify-between ${
          isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-gradient-to-b from-slate-900 to-indigo-950 border-cyan-500/30 text-white'
        }`}>
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <span>Calculated Unit COGM</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[9.5px]">Healthy Margin</span>
            </h3>

            <div className={`text-center py-2.5 rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'}`}>
              <span className={`text-[10px] font-bold uppercase block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Unit COGM Cost</span>
              <strong className="text-2xl font-mono font-black text-cyan-600 dark:text-cyan-400">${calc.unitCogm}</strong>
              <span className={`text-[9.5px] block mt-0.5 ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>Direct Material + Power + Labor - Scrap Credit</span>
            </div>

            <div className="space-y-1.5 text-xs font-mono">
              <div className={`flex justify-between ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                <span>Material Cost / Unit:</span>
                <strong className="font-bold">${calc.materialCostPerUnit}</strong>
              </div>
              <div className={`flex justify-between ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                <span>Machine Power / Unit:</span>
                <strong className="font-bold">${calc.machineCostPerUnit}</strong>
              </div>
              <div className={`flex justify-between ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                <span>Operator Labor / Unit:</span>
                <strong className="font-bold">${calc.laborCostPerUnit}</strong>
              </div>
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <span>Scrap Recovery Credit:</span>
                <strong>-${calc.scrapSalvageCredit}</strong>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800/80 space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>Suggested Wholesale Price:</span>
              <strong className="text-amber-600 dark:text-amber-400 font-mono text-sm">${calc.suggestedPrice}</strong>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className={isLight ? 'text-slate-600' : 'text-slate-400'}>Estimated Gross Margin:</span>
              <strong className="text-emerald-600 dark:text-emerald-400 font-mono text-sm">{calc.grossMargin}%</strong>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
