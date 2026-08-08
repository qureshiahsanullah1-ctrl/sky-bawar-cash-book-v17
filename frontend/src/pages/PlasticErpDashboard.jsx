import React, { useState, useEffect } from 'react';
import {
  Building2,
  TrendingUp,
  Sliders,
  RefreshCw,
  Activity,
  ShoppingCart,
  FileText,
  Shield,
  Layers,
  Zap,
  PackageCheck,
  ChevronDown,
  Users
} from 'lucide-react';

import BomBuilderModule from '../components/plastic/BomBuilderModule';
import ScrapRecoveryModule from '../components/plastic/ScrapRecoveryModule';
import IotTelemetryModule from '../components/plastic/IotTelemetryModule';
import PredictiveProcurementModule from '../components/plastic/PredictiveProcurementModule';
import FinancialReportsModule from '../components/plastic/FinancialReportsModule';
import AuditLedgerModule from '../components/plastic/AuditLedgerModule';
import ResinProfitCalculator from '../components/plastic/ResinProfitCalculator';
import CustomerAccountsModule from '../components/plastic/CustomerAccountsModule';

const PLASTICORP_DICT = {
  English: {
    title: 'PlastiCorp Enterprise',
    subtitle: 'Plastics Manufacturing Accounting, IoT PLC Telemetry & Predictive Procurement Engine',
    branchKnd: 'Kandahar Injection Molding Plant',
    branchHrt: 'Herat Extrusion Facility',
    branchAll: 'All Plant Branches Combined',
    hud: 'Executive P&L HUD',
    customers: 'Customer AR & Risk',
    calculator: 'Resin Calculator',
    bom: 'BOM Builder',
    scrap: 'Scrap Recovery',
    iot: 'IoT Telemetry',
    procurement: 'Predictive Runway',
    reports: 'Financial Reports',
    audit: 'Audit Ledger',
    grossRevenue: 'Gross Manufacturing Revenue',
    cogm: 'Cost of Goods Manufactured (COGM)',
    grossProfit: 'Net Gross Profit Margin',
    inventoryVal: 'Total 3-Stage Inventory Asset',
    outputVol: 'Production Output Volume',
    granulatorScrap: 'Granulator Scrap Recovery',
    fleetStatus: 'Machine Fleet Status',
    mfgErpVersion: 'Manufacturing ERP v2.4',
    materialPowerLabor: 'Material + Power + Labor',
    targetMargin: 'Target: 30.0%',
    healthyProfit: 'Healthy Profit',
    resinsWipSkus: 'Resins + WIP + Finished SKUs',
    auditedAsset: 'Audited Asset',
    outputVolDesc: 'Completed 120ml Bottles, 240ml Preforms, and 5L Canisters across active runs.',
    granulatorScrapDesc: 'Granulated regrind fed back into warehouse inventory at internal valuation ($0.90/kg).',
    fleetStatusDesc: 'Live OEE telemetry streaming from injection molding PLC stations.',
  },
  Pashto: {
    title: 'پلاسټي کارپ تصدۍ (PlastiCorp)',
    subtitle: 'د پلاسټیک تولیدي محاسبې، د IoT PLC ټیلیمټري او د خامو موادو د اټکل انګن',
    branchKnd: 'د کندهار د انجکشن مولډینګ فابریکه',
    branchHrt: 'د هرات د اکستروژن فابریکه',
    branchAll: 'د ټولې فابریکې ګډې څانګې',
    hud: 'اجرائیه مالی وضعیت',
    customers: 'د پیرودونکو حسابونه او خطر',
    calculator: 'د پلاسټیک موادو محاسب',
    bom: 'د جوړښت بلډر (BOM)',
    scrap: 'د زړو موادو بیرته راګرځول',
    iot: 'د تجهیزاتو ټیلیمټري (IoT)',
    procurement: 'د پیرودلو اټکل',
    reports: 'مالي راپورونه',
    audit: 'ارزونې او تفتیش دفتر',
    grossRevenue: 'د تولید ټولو عایدات',
    cogm: 'د تولید د ټولو توکو مصرف (COGM)',
    grossProfit: 'خالص ګټه او سلنه',
    inventoryVal: 'د دریو مرحلو ګدام پاتې شونې',
    outputVol: 'د تولید شوو محصولاتو اندازه',
    granulatorScrap: 'د تکراري پروسس پرزو بیا رغونه',
    fleetStatus: 'د فعالو ماشینونو حالت',
    mfgErpVersion: 'د تولید ERP ۲.۴ بڼه',
    materialPowerLabor: 'مواد + برښنا + مزدوري',
    targetMargin: 'هدف: ۳۰.۰٪',
    healthyProfit: 'سالمې او سمې ګټې',
    resinsWipSkus: 'رزین + نيمګړي + بشپړ شوي محصولات',
    auditedAsset: 'ارزول شوې پاتې شونې',
    outputVolDesc: 'د ۱۲۰ ملی لېتره بوتلونو، ۲۴۰ ملی لېتره پریفارمونو او ۵ لېتره ډبو تولید.',
    granulatorScrapDesc: 'د زړو بیا پروسس شوو پلاستیکي موادو ګدام ته غوښتل.',
    fleetStatusDesc: 'د انژکشن او تولیدي ماشینونو د PLC ژوندی جریان.',
  },
  Dari: {
    title: 'تصدی پلاستیک کارپ (PlastiCorp)',
    subtitle: 'حسابداری تولید پلاستیک، تیلمتری IoT PLC و سیستم پیش‌بینی تدارکات',
    branchKnd: 'فابریکه زرق پلاستیک قندهار',
    branchHrt: 'فابریکه اکستروژن هرات',
    branchAll: 'تمام نمایندگی‌های فابریکه',
    hud: 'داشبورد اجرایی سود و زیان',
    customers: 'حساب‌های مشتریان و ریسک',
    calculator: 'محاسبه‌گر رزین و پلاستیک',
    bom: 'سازنده فارمول تولید (BOM)',
    scrap: 'بازیافت و پروسس ضایعات',
    iot: 'تیلمتری زنده تجهیزات (IoT)',
    procurement: 'پیش‌بینی تدارکات مواد',
    reports: 'گزارش‌های مالی',
    audit: 'دفتر بررسی و تفتیش',
    grossRevenue: 'عواید ناخالص تولیدی',
    cogm: 'مصرف کالاهای ساخته‌شده (COGM)',
    grossProfit: 'سود ناخالص و فیصدی',
    inventoryVal: 'ارزش دارایی گدام ۳ مرحله‌ای',
    outputVol: 'حجم کل محصولات تولیدشده',
    granulatorScrap: 'بازیافت ضایعات آسیاب‌شده',
    fleetStatus: 'وضعیت فعالیت ماشین‌آلات',
    mfgErpVersion: 'ای‌ار‌پی تولید نسخه ۲.۴',
    materialPowerLabor: 'مواد + برق + کارگر',
    targetMargin: 'هدف: ۳۰.۰٪',
    healthyProfit: 'سود مناسب',
    resinsWipSkus: 'رزین + کالای نیمه‌ساخته + محصول نهایی',
    auditedAsset: 'دارایی ارزیابی‌شده',
    outputVolDesc: 'تولید بوتل‌های ۱۲۰ میلی‌لیتر، پریفرم‌های ۲۴۰ میلی‌لیتر و دبه‌های ۵ لیتر.',
    granulatorScrapDesc: 'بازگشت ضایعات آسیاب‌شده به انبار با ارزش داخلی (۰.۹۰ دالر/کیلوگرم).',
    fleetStatusDesc: 'جریان زنده داده‌های OEE از دستگاه‌های زرق پلاستیک.',
  }
};

function getPlasticErpDict(l) {
  if (l === 'Pashto') return PLASTICORP_DICT.Pashto;
  if (l === 'Dari') return PLASTICORP_DICT.Dari;
  return PLASTICORP_DICT.English;
}

export default function PlasticErpDashboard({ theme }) {
  const [activeTab, setActiveTab] = useState('HUD');
  const [selectedBranch, setSelectedBranch] = useState('PLANT-KND');
  const [lang, setLang] = useState(() => localStorage.getItem('cashbook_language') || 'English');
  const [themeMode, setThemeMode] = useState(() => {
    const saved = localStorage.getItem('plastic_erp_theme');
    if (saved) return saved;
    if (theme) return theme;
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    }
    return 'light';
  });

  // Sync theme if global theme changes
  useEffect(() => {
    if (!localStorage.getItem('plastic_erp_theme')) {
      const isDocDark = document.documentElement.classList.contains('dark');
      setThemeMode(isDocDark ? 'dark' : 'light');
    }
  }, [theme]);

  const isLight = themeMode === 'light';
  const dict = getPlasticErpDict(lang);

  const [kpi, setKpi] = useState({
    gross_revenue: 379750.00,
    cogm: 245000.00,
    gross_profit: 134750.00,
    gross_margin: 35.48,
    total_units: 1250000,
    total_scrap_kg: 4800.0,
    inventory_val: 124000.00,
    running_machines: 3,
    total_machines: 4
  });

  const dockItems = [
    { id: 'HUD', label: dict.hud, icon: TrendingUp },
    { id: 'CUSTOMERS', label: dict.customers, icon: Users },
    { id: 'CALCULATOR', label: dict.calculator, icon: Zap },
    { id: 'BOM', label: dict.bom, icon: Sliders },
    { id: 'SCRAP', label: dict.scrap, icon: RefreshCw },
    { id: 'IOT', label: dict.iot, icon: Activity },
    { id: 'PROCUREMENT', label: dict.procurement, icon: ShoppingCart },
    { id: 'REPORTS', label: dict.reports, icon: FileText },
    { id: 'AUDIT', label: dict.audit, icon: Shield },
  ];

  return (
    <div className={`w-full max-w-full min-h-[calc(100vh-64px)] flex flex-col font-sans relative p-2.5 sm:p-4 overflow-x-hidden no-print rounded-xl border shadow-xl transition-colors duration-300 ${
      isLight
        ? 'bg-slate-100/90 text-slate-900 border-slate-200'
        : 'bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 text-slate-100 border-slate-800/80'
    }`}>
      
      {/* 1. TOP EXECUTIVE BAR & BRANCH / LANGUAGE / THEME SWITCHER */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-2.5 p-3 rounded-xl backdrop-blur-2xl border shadow-2xs shrink-0 mb-3 transition-colors ${
        isLight
          ? 'bg-white border-slate-200 shadow-slate-200/50'
          : 'bg-slate-900/80 border-white/15 shadow-black/40'
      }`}>
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white shadow-xs shrink-0">
            <Building2 size={20} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className={`text-sm sm:text-base font-black tracking-tight uppercase ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {dict.title}
              </h1>
              <span className={`px-2 py-0.2 rounded-full border text-[9.5px] font-bold ${
                isLight ? 'bg-cyan-100 text-cyan-800 border-cyan-300' : 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
              }`}>
                {dict.mfgErpVersion}
              </span>
            </div>
            <p className={`text-[11px] font-medium leading-tight ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              {dict.subtitle}
            </p>
          </div>
        </div>

        {/* Branch & Language Selector Controls */}
        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          {/* Light / Dark Theme Toggle Button */}
          <button
            type="button"
            onClick={() => {
              const nextTheme = isLight ? 'dark' : 'light';
              setThemeMode(nextTheme);
              localStorage.setItem('plastic_erp_theme', nextTheme);
            }}
            className={`px-2.5 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1 border cursor-pointer ${
              isLight
                ? 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200'
                : 'bg-slate-950 text-cyan-400 border-slate-800 hover:bg-slate-900'
            }`}
          >
            <span>{isLight ? '☀️ Light' : '🌙 Dark'}</span>
          </button>

          {/* Language Switcher */}
          <div className={`flex items-center gap-0.5 p-0.5 rounded-lg border ${
            isLight ? 'bg-slate-100 border-slate-300' : 'bg-slate-950/90 border-slate-800'
          }`}>
            {['English', 'Pashto', 'Dari'].map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => { setLang(l); localStorage.setItem('cashbook_language', l); }}
                className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                  lang === l
                    ? 'bg-cyan-500 text-slate-950 font-black shadow-2xs'
                    : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
                }`}
              >
                {l === 'English' ? 'EN' : l === 'Pashto' ? 'پښتو' : 'دری'}
              </button>
            ))}
          </div>

          {/* Branch Selector Switcher */}
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border ${
            isLight ? 'bg-slate-100 border-slate-300 text-slate-900' : 'bg-slate-950/90 border-slate-800 text-white'
          }`}>
            <Building2 size={14} className="text-cyan-500" />
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className={`bg-transparent text-xs font-bold focus:outline-none cursor-pointer ${
                isLight ? 'text-slate-900' : 'text-white'
              }`}
            >
              <option value="PLANT-KND" className={isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'}>{dict.branchKnd}</option>
              <option value="PLANT-HRT" className={isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'}>{dict.branchHrt}</option>
              <option value="ALL" className={isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'}>{dict.branchAll}</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2. SCROLLABLE TAB MODULE CONTAINER */}
      <div className="flex-1 min-h-0 overflow-y-auto pb-20 pr-1">

      {/* 2. TAB VIEW RENDERER */}
      {activeTab === 'HUD' && (
        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
          
          {/* Executive P&L Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            
            {/* Revenue */}
            <div className={`p-3.5 rounded-xl border shadow-2xs space-y-1.5 relative overflow-hidden group transition-all ${
              isLight
                ? 'bg-white border-slate-200 shadow-slate-200/50 hover:border-cyan-500'
                : 'bg-slate-900/60 border-white/10 shadow-black/40 hover:border-cyan-500/40'
            }`}>
              <span className={`text-[9.5px] font-black uppercase tracking-wider block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                {dict.grossRevenue}
              </span>
              <strong className="text-xl font-mono font-black text-emerald-600 dark:text-emerald-400 block">
                ${kpi.gross_revenue.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </strong>
              <div className={`text-[10.5px] flex items-center justify-between pt-1.5 border-t ${
                isLight ? 'text-slate-600 border-slate-200' : 'text-slate-400 border-slate-800'
              }`}>
                <span>30-Day Batch Sales</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">+14.2%</span>
              </div>
            </div>

            {/* COGM */}
            <div className={`p-3.5 rounded-xl border shadow-2xs space-y-1.5 relative overflow-hidden group transition-all ${
              isLight
                ? 'bg-white border-slate-200 shadow-slate-200/50 hover:border-cyan-500'
                : 'bg-slate-900/60 border-white/10 shadow-black/40 hover:border-cyan-500/40'
            }`}>
              <span className={`text-[9.5px] font-black uppercase tracking-wider block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                {dict.cogm}
              </span>
              <strong className="text-xl font-mono font-black text-cyan-600 dark:text-cyan-400 block">
                ${kpi.cogm.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </strong>
              <div className={`text-[10.5px] flex items-center justify-between pt-1.5 border-t ${
                isLight ? 'text-slate-600 border-slate-200' : 'text-slate-400 border-slate-800'
              }`}>
                <span>{dict.materialPowerLabor}</span>
                <span className="text-cyan-600 dark:text-cyan-400 font-bold">10k Units/Batch</span>
              </div>
            </div>

            {/* Gross Profit Margin */}
            <div className={`p-3.5 rounded-xl border shadow-2xs space-y-1.5 relative overflow-hidden group transition-all ${
              isLight
                ? 'bg-white border-slate-200 shadow-slate-200/50 hover:border-cyan-500'
                : 'bg-slate-900/60 border-white/10 shadow-black/40 hover:border-cyan-500/40'
            }`}>
              <span className={`text-[9.5px] font-black uppercase tracking-wider block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                {dict.grossProfit}
              </span>
              <strong className="text-xl font-mono font-black text-amber-600 dark:text-amber-400 block">
                {kpi.gross_margin}% (${kpi.gross_profit.toLocaleString('en-US', { minimumFractionDigits: 2 })})
              </strong>
              <div className={`text-[10.5px] flex items-center justify-between pt-1.5 border-t ${
                isLight ? 'text-slate-600 border-slate-200' : 'text-slate-400 border-slate-800'
              }`}>
                <span>{dict.targetMargin}</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">{dict.healthyProfit}</span>
              </div>
            </div>

            {/* Inventory Asset */}
            <div className={`p-3.5 rounded-xl border shadow-2xs space-y-1.5 relative overflow-hidden group transition-all ${
              isLight
                ? 'bg-white border-slate-200 shadow-slate-200/50 hover:border-cyan-500'
                : 'bg-slate-900/60 border-white/10 shadow-black/40 hover:border-cyan-500/40'
            }`}>
              <span className={`text-[9.5px] font-black uppercase tracking-wider block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                {dict.inventoryVal}
              </span>
              <strong className="text-xl font-mono font-black text-purple-600 dark:text-purple-400 block">
                ${kpi.inventory_val.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </strong>
              <div className={`text-[10.5px] flex items-center justify-between pt-1.5 border-t ${
                isLight ? 'text-slate-600 border-slate-200' : 'text-slate-400 border-slate-800'
              }`}>
                <span>{dict.resinsWipSkus}</span>
                <span className="text-purple-600 dark:text-purple-400 font-bold">{dict.auditedAsset}</span>
              </div>
            </div>

          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className={`p-3.5 rounded-xl border shadow-2xs space-y-2 transition-all ${
              isLight ? 'bg-white border-slate-200 hover:border-cyan-500' : 'bg-slate-900/60 border-white/10 hover:border-cyan-500/40'
            }`}>
              <h3 className={`text-[11px] font-black uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                {dict.outputVol}
              </h3>
              <strong className={`text-2xl font-mono font-black block ${isLight ? 'text-slate-900' : 'text-white'}`}>
                {kpi.total_units.toLocaleString()} Units
              </strong>
              <p className={`text-xs font-medium leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                {dict.outputVolDesc}
              </p>
            </div>

            <div className={`p-3.5 rounded-xl border shadow-2xs space-y-2 transition-all ${
              isLight ? 'bg-white border-slate-200 hover:border-cyan-500' : 'bg-slate-900/60 border-white/10 hover:border-cyan-500/40'
            }`}>
              <h3 className={`text-[11px] font-black uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                {dict.granulatorScrap}
              </h3>
              <strong className="text-2xl font-mono font-black text-emerald-600 dark:text-emerald-400 block">
                {kpi.total_scrap_kg.toLocaleString()} KG
              </strong>
              <p className={`text-xs font-medium leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                {dict.granulatorScrapDesc}
              </p>
            </div>

            <div className={`p-3.5 rounded-xl border shadow-2xs space-y-2 transition-all sm:col-span-2 lg:col-span-1 ${
              isLight ? 'bg-white border-slate-200 hover:border-cyan-500' : 'bg-slate-900/60 border-white/10 hover:border-cyan-500/40'
            }`}>
              <h3 className={`text-[11px] font-black uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                {dict.fleetStatus}
              </h3>
              <strong className="text-2xl font-mono font-black text-cyan-600 dark:text-cyan-400 block">
                {kpi.running_machines} / {kpi.total_machines} Running
              </strong>
              <p className={`text-xs font-medium leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                {dict.fleetStatusDesc}
              </p>
            </div>
          </div>

        </div>
      )}


      {activeTab === 'CUSTOMERS' && <CustomerAccountsModule isLight={isLight} />}
      {activeTab === 'CALCULATOR' && <ResinProfitCalculator isLight={isLight} />}
      {activeTab === 'BOM' && <BomBuilderModule isLight={isLight} />}
      {activeTab === 'SCRAP' && <ScrapRecoveryModule isLight={isLight} />}
      {activeTab === 'IOT' && <IotTelemetryModule isLight={isLight} />}
      {activeTab === 'PROCUREMENT' && <PredictiveProcurementModule isLight={isLight} />}
      {activeTab === 'REPORTS' && <FinancialReportsModule isLight={isLight} />}
      {activeTab === 'AUDIT' && <AuditLedgerModule isLight={isLight} />}
      </div>


      {/* 3. SLEEK FLOATING BOTTOM NAVIGATION DOCK */}
      <div className="fixed bottom-12 md:bottom-3 left-1/2 -translate-x-1/2 z-50 max-w-[calc(100vw-16px)] no-print pointer-events-auto">
        <div className={`flex items-center gap-1 md:gap-1.5 p-1.5 rounded-2xl backdrop-blur-2xl border shadow-xl max-w-full overflow-x-auto no-scrollbar scrollbar-none [ms-overflow-style:none] [scrollbar-width:none] ${
          isLight
            ? 'bg-white/95 border-slate-300 ring-1 ring-slate-200/80 shadow-slate-400/30'
            : 'bg-slate-900/90 border-white/15 ring-1 ring-black/40 shadow-black/50'
        }`}>
          {dockItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`relative group flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl transition-all duration-200 shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white shadow-md scale-105'
                    : isLight
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 hover:scale-105'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80 hover:scale-105'
                }`}
                title={item.label}
              >
                <Icon size={17} />

                {/* Tooltip */}
                <span className={`absolute -top-9 px-2 py-0.5 rounded-md text-[9.5px] font-bold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border shadow-lg ${
                  isLight ? 'bg-white text-slate-900 border-slate-300' : 'bg-slate-950 text-white border-slate-800'
                }`}>
                  {item.label}
                </span>

                {/* Active Indicator Dot */}
                {isActive && (
                  <span className="absolute -bottom-0.5 w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-cyan-500/50 shadow-sm" />
                )}
              </button>
            );
          })}
        </div>
      </div>

    </div>
  );
}
