import React, { useState } from 'react';
import { FileText, Printer, Download, ArrowUpRight, DollarSign } from 'lucide-react';

export default function FinancialReportsModule({ isLight = false }) {
  const [activeTab, setActiveTab] = useState('PL');

  const report = {
    gross_revenue: 379750.00,
    cogm: 245000.00,
    cogs: 245000.00,
    gross_profit: 134750.00,
    gross_margin: 35.48,
    overhead: 44100.00,
    opex: 29400.00,
    scrap_salvage: 4320.00,
    net_operating_profit: 109670.00,
    raw_materials_asset: 45800.00,
    finished_goods_asset: 78200.00,
    total_inventory: 124000.00
  };

  return (
    <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
      
      {/* Header */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl border shadow-2xs no-print ${
        isLight ? 'bg-white/90 border-slate-200 text-slate-900' : 'bg-slate-900/60 border-white/10 text-white'
      }`}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-purple-500/20 text-purple-600 dark:text-purple-400 border border-purple-500/30">
            <FileText size={20} />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black tracking-tight uppercase flex items-center gap-2">
              <span>GAAP / IFRS Financial Statements & Export Center</span>
            </h2>
            <p className={`text-xs font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              3-Stage Balance Sheet, Trial Balance, and Tax-Ready P&L Statements isolating factory machinery depreciation.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 no-print">
          <button type="button" onClick={() => window.print()} className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs cursor-pointer">
            <Printer size={14} />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2.5 no-print">
        <button
          type="button"
          onClick={() => setActiveTab('PL')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'PL'
              ? 'bg-purple-600 text-white shadow-2xs'
              : isLight ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-slate-900/60 text-slate-400 hover:text-white'
          }`}
        >
          Income Statement (P&L)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('BS')}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'BS'
              ? 'bg-purple-600 text-white shadow-2xs'
              : isLight ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-slate-900/60 text-slate-400 hover:text-white'
          }`}
        >
          3-Stage Balance Sheet
        </button>
      </div>

      {/* Document View */}
      <div className="p-8 rounded-2xl bg-white text-slate-900 shadow-2xl border border-slate-200 print:border-none print:shadow-none font-sans space-y-6">
        
        {/* Document Header */}
        <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-end">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">PlastiCorp International</h1>
            <p className="text-xs font-bold text-slate-600">Plastics Manufacturing ERP Financial Statement</p>
          </div>
          <div className="text-right text-xs">
            <strong className="block font-bold">Reporting Period: July 2026</strong>
            <span className="text-slate-500">Currency: USD ($)</span>
          </div>
        </div>

        {activeTab === 'PL' ? (
          <div className="space-y-4 text-sm font-sans">
            <h3 className="font-black text-slate-900 uppercase text-xs tracking-wider border-b pb-1">Tax-Ready Profit & Loss Statement</h3>
            
            <div className="space-y-2">
              <div className="flex justify-between py-1 border-b border-slate-100 font-bold">
                <span>Gross Manufacturing Revenue</span>
                <strong className="font-mono text-emerald-600">${report.gross_revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100 text-slate-700">
                <span>Less: Cost of Goods Manufactured (COGM)</span>
                <span className="font-mono">(${report.cogm.toLocaleString('en-US', { minimumFractionDigits: 2 })})</span>
              </div>

              <div className="flex justify-between py-2 border-b-2 border-slate-900 font-black text-base bg-slate-50 px-2 rounded-lg">
                <span>Gross Profit</span>
                <strong className="font-mono">${report.gross_profit.toLocaleString('en-US', { minimumFractionDigits: 2 })} ({report.gross_margin}%)</strong>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100 text-slate-700">
                <span>Less: Factory Machine Overhead & Depreciation</span>
                <span className="font-mono">(${report.overhead.toLocaleString('en-US', { minimumFractionDigits: 2 })})</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100 text-slate-700">
                <span>Less: Operating & Administrative Expenses</span>
                <span className="font-mono">(${report.opex.toLocaleString('en-US', { minimumFractionDigits: 2 })})</span>
              </div>

              <div className="flex justify-between py-1 border-b border-slate-100 text-emerald-700 font-semibold">
                <span>Add: Closed-Loop Granulator Scrap Recovery Salvage Credit</span>
                <span className="font-mono">+${report.scrap_salvage.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
              </div>

              <div className="flex justify-between py-3 border-t-2 border-b-2 border-slate-900 font-black text-lg text-emerald-800 bg-emerald-50 px-3 rounded-lg mt-4">
                <span>Net Operating Profit</span>
                <strong className="font-mono">${report.net_operating_profit.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-sm font-sans">
            <h3 className="font-black text-slate-900 uppercase text-xs tracking-wider border-b pb-1">3-Stage Inventory Balance Sheet Assets</h3>

            <div className="space-y-2">
              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span>Stage 1: Raw Polymer Resins Asset (Virgin & Regrind)</span>
                <strong className="font-mono text-slate-900">${report.raw_materials_asset.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span>Stage 2: Work In Process (Active Production Runs)</span>
                <strong className="font-mono text-slate-900">$0.00</strong>
              </div>

              <div className="flex justify-between py-1.5 border-b border-slate-100">
                <span>Stage 3: Finished Plastic Goods Stock Asset</span>
                <strong className="font-mono text-slate-900">${report.finished_goods_asset.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
              </div>

              <div className="flex justify-between py-2.5 border-t-2 border-b-2 border-slate-900 font-black text-base bg-blue-50 px-3 rounded-lg text-blue-900">
                <span>Total 3-Stage Inventory Asset Valuation</span>
                <strong className="font-mono">${report.total_inventory.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
              </div>
            </div>
          </div>
        )}

        <div className="pt-6 border-t border-slate-200 text-[10px] text-slate-500 flex justify-between">
          <span>Prepared by PlastiCorp GAAP Accounting Engine</span>
          <span>Page 1 of 1</span>
        </div>

      </div>

    </div>
  );
}
