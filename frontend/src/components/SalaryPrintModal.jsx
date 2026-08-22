import React, { useState, useMemo } from 'react';
import { Printer, FileText, Banknote, Clock3, Users, Building2, Calendar, CheckCircle2, X, Download, Filter } from 'lucide-react';
import { generateSalaryReportPrintHtml } from '../utils/employeePrint';
import { currency as formatCurrency, jalaliPeriodLabel } from '../utils/format';

const PRINT_MODES = [
  {
    id: 'all',
    title: 'Complete Payroll Statement',
    titleFa: 'راپور عمومي معاشات',
    desc: 'Full breakdown: Base Salary, Carry Forward, Paid This Month, Remaining Due & Payment Status.',
    icon: FileText,
    badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
  },
  {
    id: 'salaries_only',
    title: 'Base Salaries List Only',
    titleFa: 'فقط لیست معاشات کارکوونکي',
    desc: 'Employee roster with contracted monthly base salaries, positions, departments & joining dates.',
    icon: Banknote,
    badgeColor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
  },
  {
    id: 'payments_only',
    title: 'Disbursed Payments (How Much Paid)',
    titleFa: 'مبالغ پرداخت شده / تادیات',
    desc: 'Exact transaction records of disbursed salary payments, payment methods & dates.',
    icon: CheckCircle2,
    badgeColor: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20'
  },
  {
    id: 'unpaid_only',
    title: 'Unpaid / Outstanding Balances Only',
    titleFa: 'معاشات پاتې او طلبات',
    desc: 'List of employees who have pending unpaid balances or advance carry-forwards.',
    icon: Clock3,
    badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
  }
];

const AFGHAN_MONTHS = [
  { month: 1, name: 'حمل (January/April)' },
  { month: 2, name: 'ثور (February/May)' },
  { month: 3, name: 'جوزا (March/June)' },
  { month: 4, name: 'سرطان (April/July)' },
  { month: 5, name: 'اسد (May/August)' },
  { month: 6, name: 'سنبله (June/September)' },
  { month: 7, name: 'میزان (July/October)' },
  { month: 8, name: 'عقرب (August/November)' },
  { month: 9, name: 'قوس (September/December)' },
  { month: 10, name: 'جدی (October/January)' },
  { month: 11, name: 'دلو (November/February)' },
  { month: 12, name: 'حوت (December/March)' }
];

export default function SalaryPrintModal({
  isOpen,
  onClose,
  rows = [],
  transactions = [],
  summary = {},
  filters = {},
  departments = [],
  companyName = 'BAWAR STAR PLASTIC INDUSTRY',
  companyLogo = '',
  currencyCode = 'AFN'
}) {
  const [printMode, setPrintMode] = useState('all');
  const [selectedDept, setSelectedDept] = useState('all');
  const [selectedCompany, setSelectedCompany] = useState('all');
  const [selectedCurrency, setSelectedCurrency] = useState('all');
  const [printMonth, setPrintMonth] = useState(filters?.month || new Date().getMonth() + 1);
  const [printYear, setPrintYear] = useState(filters?.year || new Date().getFullYear());

  // Filter rows based on modal selections
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (selectedDept !== 'all' && (row.department || '') !== selectedDept) return false;
      if (selectedCompany !== 'all' && (row.company_id || 'all') !== selectedCompany && (row.company_id || '') !== selectedCompany) return false;
      if (selectedCurrency !== 'all' && (row.currency || currencyCode) !== selectedCurrency) return false;
      return true;
    });
  }, [rows, selectedDept, selectedCompany, selectedCurrency, currencyCode]);

  // Filter payment transactions for payments_only mode
  const filteredPayments = useMemo(() => {
    const padM = String(printMonth).padStart(2, '0');
    const periodPrefix = `${printYear}-${padM}`;

    return transactions.filter((tx) => {
      if (tx.category !== 'salary' || tx.transaction_type !== 'cash_out') return false;
      const txPeriod = String(tx.salary_month || tx.date || '').slice(0, 7);
      if (txPeriod !== periodPrefix && !String(tx.date || '').startsWith(periodPrefix)) return false;
      if (selectedDept !== 'all' && (tx.department || '') !== selectedDept) return false;
      return true;
    });
  }, [transactions, printMonth, printYear, selectedDept]);

  if (!isOpen) return null;

  const handlePrint = (mode = printMode) => {
    const html = generateSalaryReportPrintHtml({
      rows: filteredRows,
      payments: filteredPayments,
      summary,
      filters: { month: printMonth, year: printYear },
      printMode: mode,
      companyName,
      companyLogo,
      currencyCode: selectedCurrency !== 'all' ? selectedCurrency : currencyCode
    });

    const printWindow = window.open('', '_blank', 'width=1250,height=850');
    if (!printWindow) return;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const periodStr = `${printYear}-${String(printMonth).padStart(2, '0')}`;
  const jalaliPeriod = jalaliPeriodLabel(periodStr);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-800/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
              <Printer size={24} />
            </div>
            <div>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Print Payroll & Salary Reports
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                د کارکوونکو د معاشونو، قراردادونو او تادیاتو د چاپ انتخابونه
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Step 1: Select Print Mode */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
              1. Choose Report Format / د راپور بڼه وټاکئ
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {PRINT_MODES.map((mode) => {
                const Icon = mode.icon;
                const isSelected = printMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => setPrintMode(mode.id)}
                    className={`p-3.5 rounded-2xl border text-left transition-all relative flex flex-col justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/40 ring-2 ring-blue-500/20 shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-xl border ${mode.badgeColor}`}>
                          <Icon size={18} />
                        </div>
                        <div>
                          <strong className="block text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                            {mode.title}
                          </strong>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold block">
                            {mode.titleFa}
                          </span>
                        </div>
                      </div>
                      {isSelected && (
                        <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                          ✓
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                      {mode.desc}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2: Filters & Scope */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
              2. Filter Parameters / د فلټر کولو مشخصات
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs">
              
              {/* Department */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Department / څانګه
                </label>
                <select
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-medium text-slate-800 dark:text-slate-200 outline-none"
                >
                  <option value="all">All Departments (ټولې څانګې)</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              {/* Company */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Company / شرکت
                </label>
                <select
                  value={selectedCompany}
                  onChange={(e) => setSelectedCompany(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-medium text-slate-800 dark:text-slate-200 outline-none"
                >
                  <option value="all">All Companies (ټول شرکتونه)</option>
                  <option value="bawar-star">Bawar Star Plastic Industry</option>
                  <option value="sky-ariana">Sky Ariana Ltd</option>
                </select>
              </div>

              {/* Currency */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Currency / اسعار
                </label>
                <select
                  value={selectedCurrency}
                  onChange={(e) => setSelectedCurrency(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-medium text-slate-800 dark:text-slate-200 outline-none"
                >
                  <option value="all">All Currencies (AFN & USD)</option>
                  <option value="AFN">AFN (افغانۍ)</option>
                  <option value="USD">USD (ډالر)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Step 3: Month & Year Selector */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
              3. Payroll Month & Period / دوره او میاشت
            </label>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[160px]">
                <select
                  value={printMonth}
                  onChange={(e) => setPrintMonth(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-slate-800 dark:text-slate-200 outline-none text-xs"
                >
                  {AFGHAN_MONTHS.map((m) => (
                    <option key={m.month} value={m.month}>
                      Month {m.month} - {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="w-28">
                <input
                  type="number"
                  value={printYear}
                  onChange={(e) => setPrintYear(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-mono font-bold text-slate-800 dark:text-slate-200 text-center outline-none text-xs"
                />
              </div>

              <div className="px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/50 dark:border-indigo-800/50 text-xs text-indigo-700 dark:text-indigo-300 font-bold">
                {jalaliPeriod}
              </div>
            </div>
          </div>

          {/* Quick Summary Pill */}
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-purple-500/10 border border-blue-500/20 flex items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-[10px] uppercase font-black tracking-wider text-slate-500 dark:text-slate-400 block">
                Records Included in Print
              </span>
              <strong className="text-sm font-black text-slate-900 dark:text-white">
                {printMode === 'payments_only' 
                  ? `${filteredPayments.length} Disbursed Payments` 
                  : `${filteredRows.length} Employee Records`}
              </strong>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-black tracking-wider text-slate-500 dark:text-slate-400 block">
                Target Company
              </span>
              <strong className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {selectedCompany === 'bawar-star' ? 'Bawar Star Plastic' : selectedCompany === 'sky-ariana' ? 'Sky Ariana Ltd' : 'All Companies'}
              </strong>
            </div>
          </div>

        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 sm:p-6 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all order-2 sm:order-1"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2.5 w-full sm:w-auto order-1 sm:order-2">
            <button
              type="button"
              onClick={() => handlePrint(printMode)}
              className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <Printer size={16} />
              <span>Print / Save as PDF</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
