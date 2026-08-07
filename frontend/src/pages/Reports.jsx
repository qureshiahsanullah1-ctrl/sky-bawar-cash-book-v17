/* eslint-disable */
import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  DollarSign,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  Printer,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
  Layers,
  Building2,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { currency, dateLabel, csvCell, todayInputValue } from '../utils/format';
import DateDisplay from '../components/DateDisplay';

function unescapeText(str) {
  if (!str || typeof str !== 'string') return String(str ?? '');
  let text = str;
  while (text.includes('&amp;')) {
    text = text.replace(/&amp;/g, '&');
  }
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
}

function firstDayOfMonth() {
  const date = new Date();
  date.setDate(1);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

function getTransactionEmployeeCompany(tx, employeesList) {
  if (!tx) return null;

  // 1. Match by explicit employee_id
  let emp = null;
  if (tx.employee_id) {
    emp = (employeesList || []).find((e) => Number(e.id) === Number(tx.employee_id) || String(e.id) === String(tx.employee_id));
  }
  
  // 2. Match by account_name or detail matching employee full_name
  if (!emp && tx.account_name) {
    const cleanAcc = unescapeText(tx.account_name).toLowerCase().trim();
    emp = (employeesList || []).find((e) => {
      const eName = unescapeText(e.full_name || '').toLowerCase().trim();
      return eName && (eName === cleanAcc || cleanAcc.includes(eName) || eName.includes(cleanAcc));
    });
  }
  
  if (emp) {
    const cid = emp.company_id || 'all';
    if (cid === 'sky-ariana') return 'sky-ariana';
    if (cid === 'bawar-star') return 'bawar-star';
    return 'all_employees';
  }

  // 3. If it's a salary category or employee-related transaction without explicit employee link
  const cat = unescapeText(tx.category || '').toLowerCase();
  const isSalary = cat === 'salary' || tx.payroll_kind === 'salary' || cat.includes('employee') || cat.includes('salary');
  if (isSalary) {
    if (tx.company_id === 'sky-ariana') return 'sky-ariana';
    if (tx.company_id === 'bawar-star') return 'bawar-star';
    
    const textStr = `${tx.account_name || ''} ${tx.detail || ''} ${tx.note || ''} ${tx.reference || ''}`.toLowerCase();
    if (textStr.includes('sky ariana') || textStr.includes('skyariana') || textStr.includes('ariana') || textStr.includes('✈️')) {
      return 'sky-ariana';
    }
    if (textStr.includes('bawar star') || textStr.includes('bawar') || textStr.includes('plastic') || textStr.includes('🏬')) {
      return 'bawar-star';
    }
    return 'all_employees';
  }

  return null;
}

export default function Reports({
  transactions = [],
  accounts = [],
  employees = [],
  companyName = 'CASHBOOK SYSTEM',
  companyLogo = '',
  companyAddress = '',
  companyPhone = '',
  companyEmail = '',
  currentUser,
  dateDisplayFormat = 'YYYY-MM-DD',
  currencyCode = 'AFN'
}) {
  const [reportType, setReportType] = useState('monthly');
  const [startDate, setStartDate] = useState(firstDayOfMonth);
  const [endDate, setEndDate] = useState(todayInputValue);
  const [selectedAccount, setSelectedAccount] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedPayment, setSelectedPayment] = useState('ALL');
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const [fitToScreen, setFitToScreen] = useState(true);
  const [zoomScale, setZoomScale] = useState('88%');

  // Extract unique categories from transactions
  const categories = useMemo(() => {
    const set = new Set();
    transactions.forEach((tx) => {
      if (tx.category) set.add(unescapeText(tx.category));
    });
    return Array.from(set).sort();
  }, [transactions]);

  // Extract unique accounts from transactions & accounts list
  const accountOptions = useMemo(() => {
    const set = new Map();
    accounts.forEach((acc) => set.set(String(acc.id), unescapeText(acc.name)));
    transactions.forEach((tx) => {
      if (tx.account_name) {
        const cleanName = unescapeText(tx.account_name);
        set.set(cleanName, cleanName);
      }
    });
    return Array.from(set.entries()).map(([val, name]) => ({ value: val, label: name }));
  }, [accounts, transactions]);

  // Filter transactions based on active parameters
  const filteredRows = useMemo(() => {
    let list = [...transactions];

    // Filter by Report Type / Date Range
    const todayStr = todayInputValue();
    if (reportType === 'daily') {
      list = list.filter((tx) => tx.date === todayStr);
    } else if (reportType === 'monthly') {
      const monthPrefix = todayStr.slice(0, 7); // e.g. "2026-07"
      list = list.filter((tx) => tx.date && tx.date.startsWith(monthPrefix));
    } else if (reportType === 'dateRange') {
      if (startDate) list = list.filter((tx) => tx.date >= startDate);
      if (endDate) list = list.filter((tx) => tx.date <= endDate);
    } else if (reportType === 'expenses') {
      list = list.filter((tx) => tx.transaction_type === 'cash_out' || (tx.category && tx.category.toLowerCase().includes('expense')));
    } else if (reportType === 'cash_in') {
      list = list.filter((tx) => tx.transaction_type === 'cash_in' || Number(tx.cash_in_afn || 0) > 0 || Number(tx.usd_in || 0) > 0);
    } else if (reportType === 'cash_out') {
      list = list.filter((tx) => tx.transaction_type === 'cash_out' || Number(tx.cash_out_afn || 0) > 0 || Number(tx.usd_out || 0) > 0);
    }

    // Filter by Account
    if (selectedAccount !== 'ALL') {
      list = list.filter((tx) => 
        String(tx.account_id) === String(selectedAccount) || 
        unescapeText(tx.account_name) === unescapeText(selectedAccount)
      );
    }

    // Filter by Category or Employee Report
    if (selectedCategory === 'EMP_ALL') {
      list = list.filter((tx) => getTransactionEmployeeCompany(tx, employees) !== null);
    } else if (selectedCategory === 'EMP_SKY_ARIANA') {
      list = list.filter((tx) => {
        const comp = getTransactionEmployeeCompany(tx, employees);
        return comp === 'sky-ariana' || (comp === 'all_employees' && (tx.company_id === 'sky-ariana' || !tx.company_id || tx.company_id === 'all'));
      });
    } else if (selectedCategory === 'EMP_BAWAR_STAR') {
      list = list.filter((tx) => {
        const comp = getTransactionEmployeeCompany(tx, employees);
        return comp === 'bawar-star' || (comp === 'all_employees' && (tx.company_id === 'bawar-star' || !tx.company_id || tx.company_id === 'all'));
      });
    } else if (selectedCategory !== 'ALL') {
      list = list.filter((tx) => unescapeText(tx.category) === unescapeText(selectedCategory));
    }

    // Filter by Payment Method
    if (selectedPayment !== 'ALL') {
      list = list.filter((tx) => (tx.payment_method || 'cash').toLowerCase() === selectedPayment.toLowerCase());
    }

    // Filter by Keyword Search
    const query = search.trim().toLowerCase();
    if (query) {
      list = list.filter((tx) =>
        [tx.transaction_no, unescapeText(tx.account_name), unescapeText(tx.detail), unescapeText(tx.category), tx.payment_method, tx.reference]
          .some((val) => String(val || '').toLowerCase().includes(query))
      );
    }

    // Sort chronologically (oldest first) to compute accurate running balance
    list.sort((a, b) => String(a.date).localeCompare(String(b.date)) || (a.id || 0) - (b.id || 0));

    let initialAfn = 0;
    let initialUsd = 0;
    if (selectedAccount && selectedAccount !== 'ALL') {
      const acc = accounts.find((a) => String(a.id) === String(selectedAccount) || unescapeText(a.name) === unescapeText(selectedAccount));
      if (acc) {
        initialAfn = Number(acc.opening_balance_afn || 0);
        initialUsd = Number(acc.opening_balance_usd || 0);
      }
    }

    let runningAfn = initialAfn;
    let runningUsd = initialUsd;
    list = list.map((tx) => {
      const cin = Number(tx.cash_in_afn || 0);
      const cout = Number(tx.cash_out_afn || 0);
      const uin = Number(tx.usd_in || 0);
      const uout = Number(tx.usd_out || 0);
      runningAfn += (cin - cout);
      runningUsd += (uin - uout);
      return {
        ...tx,
        running_afn_balance: runningAfn,
        running_usd_balance: runningUsd,
        has_afn: cin > 0 || cout > 0 || (uin === 0 && uout === 0),
        has_usd: uin > 0 || uout > 0
      };
    });

    if (sortOrder !== 'oldest') {
      list.reverse();
    }

    return list;
  }, [transactions, employees, accounts, reportType, startDate, endDate, selectedAccount, selectedCategory, selectedPayment, search, sortOrder]);

  // Compute summary totals
  const summary = useMemo(() => {
    let cashInAfn = 0;
    let cashOutAfn = 0;
    let usdIn = 0;
    let usdOut = 0;

    filteredRows.forEach((tx) => {
      cashInAfn += Number(tx.cash_in_afn || 0);
      cashOutAfn += Number(tx.cash_out_afn || 0);
      usdIn += Number(tx.usd_in || 0);
      usdOut += Number(tx.usd_out || 0);
    });

    const afnBalance = cashInAfn - cashOutAfn;
    const usdBalance = usdIn - usdOut;

    return {
      cashInAfn,
      cashOutAfn,
      afnBalance,
      usdIn,
      usdOut,
      usdBalance,
      count: filteredRows.length
    };
  }, [filteredRows]);

  function handleResetFilters() {
    setReportType('monthly');
    setStartDate(firstDayOfMonth());
    setEndDate(todayInputValue());
    setSelectedAccount('ALL');
    setSelectedCategory('ALL');
    setSelectedPayment('ALL');
    setSearch('');
    setSortOrder('newest');
  }

  function exportCsv() {
    if (!filteredRows.length) return;
    const headers = ['S.No', 'Date', 'TX No', 'Account Name', 'Transaction Type', 'Category', 'Payment Method', 'Detail', 'Cash In (AFN)', 'Cash Out (AFN)', 'USD In', 'USD Out', 'Running Bal (AFN)', 'Running Bal (USD)', 'Rate', 'Reference'];
    const body = filteredRows.map((tx, idx) => {
      const comp = getTransactionEmployeeCompany(tx, employees);
      const catText = comp === 'sky-ariana' ? 'Sky Ariana Employee Salary' : comp === 'bawar-star' ? 'Bawar Star Employee Salary' : comp === 'all_employees' ? 'Employee Salary' : unescapeText(tx.category || '-');
      return [
        idx + 1,
        csvCell(tx.date),
        csvCell(tx.transaction_no),
        csvCell(unescapeText(tx.account_name)),
        csvCell(tx.transaction_type),
        csvCell(catText),
        csvCell(tx.payment_method || 'cash'),
        csvCell(unescapeText(tx.detail)),
        csvCell(tx.cash_in_afn || 0),
        csvCell(tx.cash_out_afn || 0),
        csvCell(tx.usd_in || 0),
        csvCell(tx.usd_out || 0),
        csvCell(tx.running_afn_balance || 0),
        csvCell(tx.running_usd_balance || 0),
        csvCell(tx.exchange_rate || '-'),
        csvCell(tx.reference || '-')
      ];
    });

    const csvContent = [headers.join(','), ...body.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Financial_Report_${reportType}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportJson() {
    if (!filteredRows.length) return;
    const cleanedRows = filteredRows.map((tx) => {
      const comp = getTransactionEmployeeCompany(tx, employees);
      const catText = comp === 'sky-ariana' ? 'Sky Ariana Employee Salary' : comp === 'bawar-star' ? 'Bawar Star Employee Salary' : comp === 'all_employees' ? 'Employee Salary' : unescapeText(tx.category);
      return {
        ...tx,
        account_name: unescapeText(tx.account_name),
        detail: unescapeText(tx.detail),
        category: catText
      };
    });
    const blob = new Blob([JSON.stringify({ summary, reportType, filters: { startDate, endDate, account: selectedAccount }, transactions: cleanedRows }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Financial_Report_${reportType}_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function handlePrint() {
    const printWin = window.open('', '_blank', 'width=1200,height=800');
    if (!printWin) return;

    const rowsHtml = filteredRows.map((tx, idx) => {
      const comp = getTransactionEmployeeCompany(tx, employees);
      const catText = comp === 'sky-ariana' ? '✈️ Sky Ariana Salary' : comp === 'bawar-star' ? '🏬 Bawar Star Salary' : comp === 'all_employees' ? '👥 Employee Salary' : unescapeText(tx.category || '-');
      return `
      <tr>
        <td style="text-align:center;">${idx + 1}</td>
        <td>${dateLabel(tx.date)}</td>
        <td style="font-family:monospace;">${tx.transaction_no || '-'}</td>
        <td><strong>${unescapeText(tx.account_name)}</strong></td>
        <td>${catText}</td>
        <td>${unescapeText(tx.detail || '-')}</td>
        <td style="text-align:right;color:#059669;font-weight:bold;">${Number(tx.cash_in_afn || 0) > 0 ? currency(tx.cash_in_afn, 'AFN') : '-'}</td>
        <td style="text-align:right;color:#e11d48;font-weight:bold;">${Number(tx.cash_out_afn || 0) > 0 ? currency(tx.cash_out_afn, 'AFN') : '-'}</td>
        <td style="text-align:right;color:#2563eb;font-weight:bold;">${Number(tx.usd_in || 0) > 0 ? currency(tx.usd_in, 'USD') : Number(tx.usd_out || 0) > 0 ? `-${currency(tx.usd_out, 'USD')}` : '-'}</td>
        <td style="text-align:right;font-weight:bold;">${tx.has_usd && !tx.has_afn ? currency(tx.running_usd_balance, 'USD') : `${currency(tx.running_afn_balance, 'AFN')}${tx.has_usd ? `<br/><span style="font-size:9px;color:#2563eb;">${currency(tx.running_usd_balance, 'USD')}</span>` : ''}`}</td>
      </tr>
    `;
    }).join('');

    const html = `
      <!doctype html>
      <html>
      <head>
        <title>Financial Report - ${companyName}</title>
        <style>
          @page { size: A4 landscape; margin: 8mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; margin: 0; padding: 0; font-size: 11px; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 16px; }
          .logo { max-height: 48px; max-width: 140px; object-fit: contain; }
          .title { font-size: 18px; font-weight: bold; color: #1e293b; margin: 0; }
          .subtitle { font-size: 11px; color: #64748b; margin-top: 2px; }
          .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 16px; }
          .summary-card { background: #f8fafc; border: 1px solid #e2e8f0; padding: 10px; border-radius: 8px; }
          .summary-card span { font-size: 10px; color: #64748b; font-weight: bold; text-transform: uppercase; display: block; }
          .summary-card strong { font-size: 14px; font-weight: bold; font-family: monospace; display: block; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 10px; }
          th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; }
          th { background: #f1f5f9; color: #334155; font-weight: bold; text-transform: uppercase; font-size: 9px; }
          .signatures { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 40px; }
          .signatures div { border-top: 1px solid #334155; padding-top: 6px; text-align: center; font-size: 10px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">${companyName} - Financial Report</h1>
            <p class="subtitle">Generated on ${new Date().toLocaleDateString()} | Scope: ${reportType.toUpperCase()}</p>
          </div>
          ${companyLogo ? `<img src="${companyLogo}" class="logo" />` : ''}
        </div>

        <div class="summary-grid">
          <div class="summary-card">
            <span>Total Cash In</span>
            <strong style="color:#059669;">${currency(summary.cashInAfn, 'AFN')}</strong>
          </div>
          <div class="summary-card">
            <span>Total Cash Out</span>
            <strong style="color:#e11d48;">${currency(summary.cashOutAfn, 'AFN')}</strong>
          </div>
          <div class="summary-card">
            <span>Net AFN Balance</span>
            <strong style="color:#2563eb;">${currency(summary.afnBalance, 'AFN')}</strong>
          </div>
          <div class="summary-card">
            <span>Net USD / TX Count</span>
            <strong style="color:#4f46e5;">${currency(summary.usdBalance, 'USD')} (${summary.count} TXs)</strong>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width:30px;text-align:center;">#</th>
              <th style="width:75px;">Date</th>
              <th style="width:110px;">TX No</th>
              <th style="width:150px;">Account Name</th>
              <th style="width:90px;">Category</th>
              <th>Particulars Detail</th>
              <th style="width:95px;text-align:right;">Cash In (AFN)</th>
              <th style="width:95px;text-align:right;">Cash Out (AFN)</th>
              <th style="width:95px;text-align:right;">USD Amount</th>
              <th style="width:105px;text-align:right;">Balance</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>

        <div class="signatures">
          <div>Prepared By: ${currentUser?.full_name || 'Accountant'}</div>
          <div>Audited By</div>
          <div>Manager Approval</div>
        </div>

        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWin.document.write(html);
    printWin.document.close();
  }

  return (
    <div 
      className="w-full space-y-4 text-slate-900 dark:text-slate-100 transition-all origin-top"
      style={{ zoom: zoomScale }}
    >
      {/* 1. Header with Controls & Zoom Level Controls */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white/85 dark:bg-[#0f172a]/85 backdrop-blur-md p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800/80 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/20 dark:from-blue-500/30 dark:to-indigo-500/30 text-blue-600 dark:text-blue-400 border border-blue-500/30 shrink-0 shadow-inner">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <span>Reports & Financial Analytics</span>
            </h1>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
              Real-time daily, monthly, and custom date range financial summaries
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Zoom Selector */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/90 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-inner">
            <ZoomOut className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 ml-1" />
            <select
              value={zoomScale}
              onChange={(e) => setZoomScale(e.target.value)}
              className="bg-transparent text-xs font-extrabold text-slate-800 dark:text-slate-200 outline-none cursor-pointer pr-1"
              aria-label="Screen Zoom Level"
            >
              <option value="85%" className="bg-white dark:bg-slate-900">85% (Ultra Fit)</option>
              <option value="88%" className="bg-white dark:bg-slate-900">88% (Compact Fit)</option>
              <option value="95%" className="bg-white dark:bg-slate-900">95% (Standard Fit)</option>
              <option value="100%" className="bg-white dark:bg-slate-900">100% (Full Size)</option>
            </select>
          </div>

          {/* Fit to Screen Toggle */}
          <button
            onClick={() => setFitToScreen(!fitToScreen)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shadow-xs ${
              fitToScreen
                ? 'bg-blue-50 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700/80 shadow-blue-500/10'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700'
            }`}
            title={fitToScreen ? 'Switch to Scroll View' : 'Fit Table to Screen Width'}
          >
            {fitToScreen ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
            <span>{fitToScreen ? 'Fit Screen' : 'Scroll View'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/90 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 shadow-xs transition-all"
          >
            <Printer className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" /> Print
          </button>
          <button
            onClick={exportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/90 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 shadow-xs transition-all"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" /> CSV
          </button>
          <button
            onClick={exportJson}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/90 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 shadow-xs transition-all"
          >
            <Download className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" /> JSON
          </button>
        </div>
      </header>

      {/* 2. Control Panel Filter Workspace */}
      <div className="w-full bg-gradient-to-br from-white via-slate-50/50 to-white dark:from-[#0f172a]/90 dark:via-[#0f172a]/70 dark:to-[#0f172a]/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200/90 dark:border-slate-800/80 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
          <div className="flex items-center gap-2 text-[11px] font-extrabold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" /> Report Criteria & Filtering
          </div>
          <button
            onClick={handleResetFilters}
            className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <RefreshCw className="w-3 h-3" /> Reset Filters
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Report Type */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50/90 dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700/80 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none shadow-inner"
            >
              <option value="monthly" className="bg-white dark:bg-slate-900">Monthly Report (This Month)</option>
              <option value="daily" className="bg-white dark:bg-slate-900">Daily Report (Today)</option>
              <option value="dateRange" className="bg-white dark:bg-slate-900">Custom Date Range</option>
              <option value="all" className="bg-white dark:bg-slate-900">All Transactions (Full Ledger)</option>
              <option value="expenses" className="bg-white dark:bg-slate-900">Expense Report (Cash Out)</option>
              <option value="cash_in" className="bg-white dark:bg-slate-900">Income Report (Cash In)</option>
            </select>
          </div>

          {/* Account Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Account Scoping</label>
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50/90 dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700/80 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none shadow-inner"
            >
              <option value="ALL" className="bg-white dark:bg-slate-900">All Accounts (Consolidated)</option>
              {accountOptions.map((acc) => (
                <option key={acc.value} value={acc.value} className="bg-white dark:bg-slate-900">{acc.label}</option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50/90 dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700/80 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none shadow-inner"
            >
              <option value="ALL" className="bg-white dark:bg-slate-900 font-bold">All Categories</option>
              <optgroup label="── EMPLOYEES REPORT ──" className="bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 font-bold">
                <option value="EMP_ALL" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100">👥 All Employees (Salaries)</option>
                <option value="EMP_SKY_ARIANA" className="bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-400 font-bold">✈️ Sky Ariana Employees</option>
                <option value="EMP_BAWAR_STAR" className="bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 font-bold">🏬 Bawar Star Employees</option>
              </optgroup>
              <optgroup label="── TRANSACTION CATEGORIES ──" className="bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-bold">
                {categories.map((cat) => (
                  <option key={cat} value={cat} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-normal">{cat.replace('_', ' ')}</option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Keyword Search */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Search Keywords</label>
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search account, detail, TX..."
                className="w-full pl-8 pr-3 py-2 bg-slate-50/90 dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700/80 rounded-xl text-xs font-medium text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none shadow-inner"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-2.5 top-2.5" />
            </div>
          </div>

          {/* Sort Order */}
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400 mb-1">Sort Sequence</label>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50/90 dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700/80 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none shadow-inner"
            >
              <option value="newest" className="bg-white dark:bg-slate-900">Newest First</option>
              <option value="oldest" className="bg-white dark:bg-slate-900">Oldest First</option>
            </select>
          </div>
        </div>

        {/* Date Pickers for Custom Date Range */}
        {reportType === 'dateRange' && (
          <div className="flex flex-wrap items-center gap-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400">From Date:</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400">To Date:</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>
        )}
      </div>

      {/* 3. Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full">
        {/* Total Cash In */}
        <div className="bg-gradient-to-br from-white via-emerald-50/20 to-white dark:from-[#0f172a]/90 dark:via-emerald-950/20 dark:to-[#0f172a]/90 backdrop-blur-md p-4 rounded-2xl border border-emerald-200/60 dark:border-emerald-500/30 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Cash In</span>
            <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/80 shadow-inner">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums font-mono tracking-tight">
              {currency(summary.cashInAfn, 'AFN')}
            </div>
            {summary.usdIn > 0 && (
              <div className="text-xs font-bold text-emerald-600/80 dark:text-emerald-400/80 font-mono mt-0.5">
                + {currency(summary.usdIn, 'USD')}
              </div>
            )}
          </div>
        </div>

        {/* Total Cash Out */}
        <div className="bg-gradient-to-br from-white via-rose-50/20 to-white dark:from-[#0f172a]/90 dark:via-rose-950/20 dark:to-[#0f172a]/90 backdrop-blur-md p-4 rounded-2xl border border-rose-200/60 dark:border-rose-500/30 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Cash Out</span>
            <div className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/80 shadow-inner">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 tabular-nums font-mono tracking-tight">
              {currency(summary.cashOutAfn, 'AFN')}
            </div>
            {summary.usdOut > 0 && (
              <div className="text-xs font-bold text-rose-600/80 dark:text-rose-400/80 font-mono mt-0.5">
                + {currency(summary.usdOut, 'USD')}
              </div>
            )}
          </div>
        </div>

        {/* Net AFN Balance */}
        <div className="bg-gradient-to-br from-white via-blue-50/20 to-white dark:from-[#0f172a]/90 dark:via-blue-950/20 dark:to-[#0f172a]/90 backdrop-blur-md p-4 rounded-2xl border border-blue-200/60 dark:border-blue-500/30 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Net AFN Balance</span>
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/80 shadow-inner">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className={`text-xl sm:text-2xl font-black tabular-nums font-mono tracking-tight ${summary.afnBalance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {currency(summary.afnBalance, 'AFN')}
            </div>
            <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
              Net operating income
            </div>
          </div>
        </div>

        {/* Net USD Balance / Count */}
        <div className="bg-gradient-to-br from-white via-indigo-50/20 to-white dark:from-[#0f172a]/90 dark:via-indigo-950/20 dark:to-[#0f172a]/90 backdrop-blur-md p-4 rounded-2xl border border-indigo-200/60 dark:border-indigo-500/30 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">Net USD / Transactions</span>
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/80 shadow-inner">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 tabular-nums font-mono tracking-tight">
              {currency(summary.usdBalance, 'USD')}
            </div>
            <div className="text-xs font-bold text-slate-600 dark:text-slate-300 mt-0.5">
              {summary.count} transactions matched
            </div>
          </div>
        </div>
      </div>

      {/* 4. Main Report Table (Visible on Tablet & Desktop) */}
      <div className="w-full bg-white/90 dark:bg-[#0f172a]/90 backdrop-blur-md rounded-2xl border border-slate-200/90 dark:border-slate-800/80 overflow-hidden shadow-md hidden md:block">
        <div className={`w-full max-h-[68vh] min-h-[360px] overflow-y-auto ${fitToScreen ? 'overflow-x-hidden' : 'overflow-x-auto'}`}>
          <table className={fitToScreen ? "w-full table-fixed text-left border-collapse" : "w-full min-w-[1050px] text-left border-collapse"}>
            <thead className="sticky top-0 z-20 bg-slate-100/95 dark:bg-[#1e293b]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-700/80 shadow-xs">
              <tr className="text-[10px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                <th className={fitToScreen ? "py-3 px-2 text-center w-[3.5%]" : "py-3 px-3 text-center min-w-[40px]"}>#</th>
                <th className={fitToScreen ? "py-3 px-2 w-[10%]" : "py-3 px-3 min-w-[100px]"}>Date</th>
                <th className={fitToScreen ? "py-3 px-2 w-[12%]" : "py-3 px-3 min-w-[110px]"}>TX No</th>
                <th className={fitToScreen ? "py-3 px-2 w-[18%]" : "py-3 px-4 min-w-[180px]"}>Account Name</th>
                <th className={fitToScreen ? "py-3 px-2 w-[10%]" : "py-3 px-3 min-w-[100px]"}>Category</th>
                <th className={fitToScreen ? "py-3 px-2 w-[21.5%]" : "py-3 px-4 min-w-[200px]"}>Particulars Detail</th>
                <th className={fitToScreen ? "py-3 px-2 text-right w-[8.5%]" : "py-3 px-3 text-right min-w-[110px]"}>Cash In</th>
                <th className={fitToScreen ? "py-3 px-2 text-right w-[8.5%]" : "py-3 px-3 text-right min-w-[110px]"}>Cash Out</th>
                <th className={fitToScreen ? "py-3 px-2 text-right w-[8%]" : "py-3 px-3 text-right min-w-[100px]"}>USD</th>
                <th className={fitToScreen ? "py-3 px-2 text-right w-[9.5%]" : "py-3 px-3 text-right min-w-[130px]"}>{fitToScreen ? "Balance" : "Remaining Balance"}</th>
                <th className={fitToScreen ? "py-3 px-1.5 text-center w-[5.5%]" : "py-3 px-2 text-center min-w-[70px]"}>Method</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan="11" className="py-16 text-center text-slate-500 dark:text-slate-400 font-medium text-sm">
                    No transactions found matching the report criteria.
                  </td>
                </tr>
              ) : (
                filteredRows.map((tx, idx) => {
                  const cleanAccountName = unescapeText(tx.account_name);
                  const cleanDetail = unescapeText(tx.detail);
                  const cleanCategory = unescapeText(tx.category);

                  return (
                    <tr key={tx.id || idx} className="odd:bg-white dark:odd:bg-[#0f172a]/60 even:bg-slate-50/60 dark:even:bg-[#1e293b]/40 hover:bg-blue-50/60 dark:hover:bg-blue-950/50 transition-colors border-b border-slate-200/50 dark:border-slate-800/60">
                      <td className={fitToScreen ? "py-2.5 px-2 text-center font-mono text-slate-400 dark:text-slate-500 text-[10.5px] font-medium" : "py-2.5 px-3 text-center font-mono text-slate-400 dark:text-slate-500 font-medium"}>
                        {idx + 1}
                      </td>
                      <td className={fitToScreen ? "py-2.5 px-2 font-bold text-slate-900 dark:text-slate-100 text-[11px] truncate" : "py-2.5 px-3 font-bold text-slate-900 dark:text-slate-100 whitespace-nowrap text-[11px]"}>
                        <DateDisplay value={tx.date} format={dateDisplayFormat} />
                      </td>
                      <td className={fitToScreen ? "py-2.5 px-2 font-mono text-slate-500 dark:text-slate-400 text-[10.5px] font-medium truncate" : "py-2.5 px-3 font-mono text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap"}>
                        {tx.transaction_no || '-'}
                      </td>
                      <td className={fitToScreen ? "py-2.5 px-2 font-extrabold text-slate-900 dark:text-white truncate" : "py-2.5 px-4 font-extrabold text-slate-900 dark:text-white"} title={cleanAccountName}>
                        <span className="truncate block text-[11.5px]">{cleanAccountName}</span>
                      </td>
                      <td className={fitToScreen ? "py-2.5 px-2 truncate" : "py-2.5 px-3"}>
                        {(() => {
                          const comp = getTransactionEmployeeCompany(tx, employees);
                          if (comp === 'sky-ariana') {
                            return (
                              <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-sky-100 dark:bg-sky-950/80 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-700 inline-flex items-center gap-1 max-w-full shadow-2xs">
                                <span>✈️</span> <span className="truncate">Sky Ariana Emp</span>
                              </span>
                            );
                          }
                          if (comp === 'bawar-star') {
                            return (
                              <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-indigo-100 dark:bg-indigo-950/80 text-indigo-800 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700 inline-flex items-center gap-1 max-w-full shadow-2xs">
                                <span>🏬</span> <span className="truncate">Bawar Star Emp</span>
                              </span>
                            );
                          }
                          if (comp === 'all_employees') {
                            return (
                              <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-700 inline-flex items-center gap-1 max-w-full shadow-2xs">
                                <span>👥</span> <span className="truncate">Employee Salary</span>
                              </span>
                            );
                          }
                          return (
                            <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 inline-block truncate max-w-full shadow-2xs">
                              {cleanCategory ? cleanCategory.replace('_', ' ') : 'General'}
                            </span>
                          );
                        })()}
                      </td>
                      <td className={fitToScreen ? "py-2.5 px-2 text-slate-700 dark:text-slate-300 font-medium text-[11px] truncate" : "py-2.5 px-4 text-slate-700 dark:text-slate-300 font-medium max-w-xl text-[11px]"} title={cleanDetail}>
                        <span className="truncate block">{cleanDetail || '-'}</span>
                      </td>
                      <td className={fitToScreen ? "py-2.5 px-2 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 text-[11px] tabular-nums truncate" : "py-2.5 px-3 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 whitespace-nowrap tabular-nums text-[11px]"}>
                        {Number(tx.cash_in_afn || 0) > 0 ? currency(tx.cash_in_afn, 'AFN') : '-'}
                      </td>
                      <td className={fitToScreen ? "py-2.5 px-2 text-right font-mono font-black text-rose-600 dark:text-rose-400 text-[11px] tabular-nums truncate" : "py-2.5 px-3 text-right font-mono font-black text-rose-600 dark:text-rose-400 whitespace-nowrap tabular-nums text-[11px]"}>
                        {Number(tx.cash_out_afn || 0) > 0 ? currency(tx.cash_out_afn, 'AFN') : '-'}
                      </td>
                      <td className={fitToScreen ? "py-2.5 px-2 text-right font-mono font-black text-indigo-600 dark:text-indigo-400 text-[11px] tabular-nums truncate" : "py-2.5 px-3 text-right font-mono font-black text-indigo-600 dark:text-indigo-400 whitespace-nowrap tabular-nums text-[11px]"}>
                        {Number(tx.usd_in || 0) > 0 ? currency(tx.usd_in, 'USD') : Number(tx.usd_out || 0) > 0 ? `-${currency(tx.usd_out, 'USD')}` : '-'}
                      </td>
                      <td className={fitToScreen ? "py-2.5 px-2 text-right font-mono text-[11px] tabular-nums truncate" : "py-2.5 px-3 text-right font-mono text-[11px] whitespace-nowrap tabular-nums"}>
                        {tx.has_usd && !tx.has_afn ? (
                          <span className={`font-black ${tx.running_usd_balance >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {currency(tx.running_usd_balance, 'USD')}
                          </span>
                        ) : (
                          <div className="flex flex-col items-end justify-center">
                            <span className={`font-black ${tx.running_afn_balance >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-400'}`}>
                              {currency(tx.running_afn_balance, 'AFN')}
                            </span>
                            {tx.has_usd && (
                              <span className={`text-[9.5px] font-bold ${tx.running_usd_balance >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-500 dark:text-rose-400'}`}>
                                {currency(tx.running_usd_balance, 'USD')}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className={fitToScreen ? "py-2.5 px-1.5 text-center uppercase font-mono text-[9.5px] font-extrabold text-slate-500 dark:text-slate-400 truncate" : "py-2.5 px-2 text-center uppercase font-mono text-[10px] font-extrabold text-slate-500 dark:text-slate-400 whitespace-nowrap"}>
                        {tx.payment_method || 'cash'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dedicated High-Quality Mobile Transactions Card List (Visible on Mobile) */}
      <div className="block md:hidden w-full flex flex-col gap-3">
        {filteredRows.length === 0 ? (
          <div className="p-8 text-center bg-white/90 dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs">
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400">No transactions found matching report criteria.</p>
          </div>
        ) : (
          filteredRows.map((tx, idx) => {
            const cleanAccountName = unescapeText(tx.account_name);
            const cleanDetail = unescapeText(tx.detail);
            const cleanCategory = unescapeText(tx.category);
            const isCashIn = tx.transaction_type === 'cash_in' || Number(tx.cash_in_afn || 0) > 0 || Number(tx.usd_in || 0) > 0;

            return (
              <div key={tx.id || idx} className="p-4 rounded-2xl bg-white/95 dark:bg-[#0f172a]/95 border border-slate-200/90 dark:border-slate-800/90 shadow-sm flex flex-col gap-3">
                {/* Mobile Header: Index, Date, Type Badge */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-extrabold text-[10px] flex items-center justify-center shrink-0">
                      #{idx + 1}
                    </span>
                    <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                      <DateDisplay value={tx.date} format={dateDisplayFormat} />
                    </span>
                    {tx.transaction_no && (
                      <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 truncate">
                        {tx.transaction_no}
                      </span>
                    )}
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide shrink-0 ${
                    isCashIn 
                      ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                      : 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-700'
                  }`}>
                    {isCashIn ? '📥 Cash In' : '📤 Cash Out'}
                  </span>
                </div>

                {/* Account & Detail */}
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900 dark:text-white leading-tight">
                    {cleanAccountName}
                  </h4>
                  {cleanDetail && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 font-medium leading-relaxed">
                      {cleanDetail}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md text-[9.5px] font-extrabold uppercase bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      🏷️ {cleanCategory ? cleanCategory.replace('_', ' ') : 'General'}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[9.5px] font-extrabold uppercase bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                      💳 {tx.payment_method || 'cash'}
                    </span>
                  </div>
                </div>

                {/* Financial Summary Grid */}
                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800">
                  <div>
                    <span className="text-[9.5px] font-extrabold uppercase text-slate-400 block mb-0.5">Amount</span>
                    {Number(tx.cash_in_afn || 0) > 0 && (
                      <span className="font-mono font-black text-xs text-emerald-600 dark:text-emerald-400 block">
                        +{currency(tx.cash_in_afn, 'AFN')}
                      </span>
                    )}
                    {Number(tx.cash_out_afn || 0) > 0 && (
                      <span className="font-mono font-black text-xs text-rose-600 dark:text-rose-400 block">
                        -{currency(tx.cash_out_afn, 'AFN')}
                      </span>
                    )}
                    {Number(tx.usd_in || 0) > 0 && (
                      <span className="font-mono font-black text-xs text-indigo-600 dark:text-indigo-400 block">
                        +${tx.usd_in} USD
                      </span>
                    )}
                    {Number(tx.usd_out || 0) > 0 && (
                      <span className="font-mono font-black text-xs text-rose-600 dark:text-rose-400 block">
                        -${tx.usd_out} USD
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-[9.5px] font-extrabold uppercase text-slate-400 block mb-0.5">Running Balance</span>
                    <span className={`font-mono font-black text-xs block ${tx.running_afn_balance >= 0 ? 'text-slate-900 dark:text-white' : 'text-rose-600 dark:text-rose-400'}`}>
                      {currency(tx.running_afn_balance, 'AFN')}
                    </span>
                    {tx.has_usd && (
                      <span className={`font-mono text-[10px] font-bold block ${tx.running_usd_balance >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-500'}`}>
                        {currency(tx.running_usd_balance, 'USD')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
