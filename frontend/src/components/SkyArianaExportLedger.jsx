import React, { useState, useMemo, useEffect } from 'react';
import { 
  Building2, 
  Search, 
  Download, 
  Printer, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Ship, 
  Container, 
  DollarSign, 
  MapPin, 
  Award,
  Plus,
  X,
  SquarePen,
  Trash2,
  CheckCircle2,
  FileCheck,
  ShieldCheck,
  Check
} from 'lucide-react';
import { ACCOUNT_PROFILE, SKY_ARIANA_EXPORT_TRANSACTIONS } from '../data/skyArianaExportData';
import { useCompany } from '../context/CompanyContext';
import NewExportTransactionModal from './NewExportTransactionModal';
import { printExportLedgerDocument, generateExportLedgerPrintHtml } from '../utils/exportLedgerPrint';

export default function SkyArianaExportLedger({ account }) {
  const { currentCompany } = useCompany();
  const [transactions, setTransactions] = useState(account?.transactions || SKY_ARIANA_EXPORT_TRANSACTIONS);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'invoice' | 'payment' | 'surrendered'

  useEffect(() => {
    if (account?.transactions) {
      setTransactions(account.transactions);
    }
  }, [account]);

  const ACCOUNT_DATA = account ? {
    companyName: 'SKY ARIANA LTD',
    accountName: account.clientName,
    accountNameDari: account.clientNameDari,
    licenseNo: account.licenseNo || '2401-2198',
    logo: ACCOUNT_PROFILE.logo
  } : ACCOUNT_PROFILE;

  // Modal State for New / Edit Export Transaction & Print Preview
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    type: 'invoice',
    date: new Date().toISOString().split('T')[0],
    shipper: '',
    consignee: '',
    commodityInvoice: '',
    blContainer: '',
    quantity: 1,
    amountUSD: '',
    notes: '',
    isSurrenderedBL: false
  });

  // Recalculate running balance for full dataset
  const recalculateBalances = (dataList) => {
    let currentBal = 0;
    return dataList.map((tx, idx) => {
      const credit = tx.creditUSD || 0;
      const debit = tx.debitUSD || 0;
      currentBal += (credit - debit);
      return {
        ...tx,
        sn: idx + 1,
        balanceUSD: currentBal
      };
    });
  };

  // Dynamic Filter Logic
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (filterType === 'invoice' && tx.type !== 'invoice') return false;
      if (filterType === 'payment' && tx.type !== 'payment') return false;
      if (filterType === 'surrendered' && !tx.isSurrenderedBL) return false;

      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        tx.date.toLowerCase().includes(q) ||
        (tx.shipper && tx.shipper.toLowerCase().includes(q)) ||
        (tx.consignee && tx.consignee.toLowerCase().includes(q)) ||
        tx.commodityInvoice.toLowerCase().includes(q) ||
        (tx.blContainer && tx.blContainer.toLowerCase().includes(q)) ||
        (tx.notes && tx.notes.toLowerCase().includes(q))
      );
    });
  }, [transactions, searchTerm, filterType]);

  // Aggregate Metrics Calculations
  const totals = useMemo(() => {
    let credit = 0;
    let debit = 0;
    let containers = 0;
    let surrenderedCount = 0;

    transactions.forEach((tx) => {
      credit += tx.creditUSD || 0;
      debit += tx.debitUSD || 0;
      containers += tx.quantity || 0;
      if (tx.isSurrenderedBL) surrenderedCount += 1;
    });

    const netBalance = credit - debit;

    return {
      totalCredit: credit,
      totalDebit: debit,
      netBalance,
      totalContainers: containers,
      surrenderedCount
    };
  }, [transactions]);

  // Format Currency USD
  const formatUSD = (amount) => {
    if (amount === 0 || amount === null || amount === undefined) return '$0.00';
    const isNegative = amount < 0;
    const absVal = Math.abs(amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    return isNegative ? `-$${absVal}` : `$${absVal}`;
  };

  // Open Modal for Add
  const handleOpenAddModal = () => {
    setEditingId(null);
    setFormData({
      type: 'invoice',
      date: new Date().toISOString().split('T')[0],
      shipper: '',
      consignee: '',
      commodityInvoice: '',
      blContainer: '',
      quantity: 1,
      amountUSD: '',
      notes: '',
      isSurrenderedBL: false
    });
    setIsModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEditModal = (tx) => {
    setEditingId(tx.id);
    setFormData({
      type: tx.type || 'invoice',
      date: tx.date || new Date().toISOString().split('T')[0],
      shipper: tx.shipper || '',
      consignee: tx.consignee || '',
      commodityInvoice: tx.commodityInvoice || '',
      blContainer: tx.blContainer || '',
      quantity: tx.quantity || 1,
      amountUSD: (tx.creditUSD || tx.debitUSD || 0).toString(),
      notes: tx.notes || '',
      isSurrenderedBL: !!tx.isSurrenderedBL
    });
    setIsModalOpen(true);
  };

  // Delete Transaction Handler
  const handleDeleteTransaction = (id) => {
    if (window.confirm('Are you sure you want to delete this export transaction?')) {
      const updated = transactions.filter(t => t.id !== id);
      setTransactions(recalculateBalances(updated));
    }
  };

  // Save (Add or Update) Transaction Handler
  const handleSaveTransaction = (e) => {
    e.preventDefault();
    const amountNum = parseFloat(formData.amountUSD) || 0;
    if (amountNum <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    const isInvoice = formData.type === 'invoice';
    const creditUSD = isInvoice ? amountNum : 0;
    const debitUSD = !isInvoice ? amountNum : 0;

    let updatedList = [];

    if (editingId !== null) {
      // EDIT Mode
      updatedList = transactions.map(tx => {
        if (tx.id === editingId) {
          return {
            ...tx,
            type: formData.type,
            date: formData.date,
            shipper: formData.shipper || (isInvoice ? 'NAJEB-AMIN LTD' : 'CASH DEPOSIT'),
            consignee: formData.consignee || (isInvoice ? 'EXPORT CLIENT' : 'DUBAI DEPOSIT'),
            commodityInvoice: formData.commodityInvoice || (isInvoice ? 'EXPORT INVOICE' : 'PAYMENT DEPOSIT'),
            blContainer: formData.blContainer || (isInvoice ? '1X40 HC / BL-PENDING' : 'TRANSFER / CASH'),
            quantity: isInvoice ? (parseInt(formData.quantity) || 1) : 0,
            creditUSD,
            debitUSD,
            notes: formData.notes,
            isSurrenderedBL: isInvoice ? formData.isSurrenderedBL : false
          };
        }
        return tx;
      });
    } else {
      // ADD Mode
      const newTx = {
        id: Date.now(),
        sn: transactions.length + 1,
        date: formData.date,
        shipper: formData.shipper || (isInvoice ? 'NAJEB-AMIN LTD' : 'CASH DEPOSIT'),
        consignee: formData.consignee || (isInvoice ? 'EXPORT CLIENT' : 'DUBAI DEPOSIT'),
        commodityInvoice: formData.commodityInvoice || (isInvoice ? 'EXPORT INVOICE' : 'PAYMENT DEPOSIT'),
        blContainer: formData.blContainer || (isInvoice ? '1X40 HC / BL-PENDING' : 'TRANSFER / CASH'),
        quantity: isInvoice ? (parseInt(formData.quantity) || 1) : 0,
        creditUSD,
        debitUSD,
        balanceUSD: 0,
        type: formData.type,
        notes: formData.notes,
        isSurrenderedBL: isInvoice ? formData.isSurrenderedBL : false
      };
      updatedList = [...transactions, newTx];
    }

    setTransactions(recalculateBalances(updatedList));
    setIsModalOpen(false);
  };

  // CSV Export Handler
  const handleExportCSV = () => {
    const headers = [
      'S.N',
      'Date',
      'Shipper',
      'Consignee',
      'Commodity & Invoice',
      'B/L & Container',
      'Surrendered B/L',
      'Qty',
      'Credit (USD)',
      'Debit (USD)',
      'Balance (USD)'
    ];

    const rows = filteredTransactions.map(tx => [
      tx.sn,
      tx.date,
      `"${tx.shipper || ''}"`,
      `"${tx.consignee || ''}"`,
      `"${tx.commodityInvoice || ''}"`,
      `"${tx.blContainer || ''}"`,
      tx.isSurrenderedBL ? 'YES (Surrendered)' : 'NO (Original)',
      tx.quantity,
      tx.creditUSD,
      tx.debitUSD,
      tx.balanceUSD
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Sky_Ariana_Export_Ledger_${ACCOUNT_DATA.accountName.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    setIsPrintPreviewOpen(true);
  };

  const executePrint = () => {
    printExportLedgerDocument({
      account: ACCOUNT_DATA,
      transactions: filteredTransactions,
      totals,
      companyName: currentCompany?.name || 'SKY ARIANA LTD',
      companyLogo: logoPath
    });
  };

  const logoPath = currentCompany?.id === 'sky-ariana' && currentCompany?.logo
    ? currentCompany.logo 
    : ACCOUNT_DATA.logo;

  return (
    <div className="sky-ariana-export-page h-full flex flex-col gap-2 p-2 sm:p-3 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans overflow-hidden print:fixed print:top-0 print:left-0 print:right-0 print:bottom-0 print:inset-0 print:z-[99999] print:bg-white print:w-screen print:h-auto print:p-6 print:m-0 print:block">
      
      {/* PRINT-ONLY CORPORATE EXECUTIVE LETTERHEAD HEADER */}
      <div className="hidden print:flex flex-col gap-3 mb-4 pb-3 border-b-2 border-slate-900 text-slate-900">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <img src={logoPath} alt="SKY ARIANA" className="w-12 h-12 object-contain rounded-lg p-1 bg-slate-900" />
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase leading-none">SKY ARIANA LTD</h1>
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mt-1">International Freight Forwarding & Logistics Management</p>
            </div>
          </div>
          <div className="text-right text-[10px] text-slate-500 font-sans leading-tight">
            <span className="inline-block px-2.5 py-0.5 bg-slate-900 text-white font-bold text-[10px] uppercase tracking-widest rounded mb-1">
              STATEMENT OF ACCOUNT
            </span>
            <p><strong>Lic:</strong> {ACCOUNT_DATA.licenseNo} | <strong>Location:</strong> Kandahar, AF | Dubai: Al Ras, Deira</p>
            <p><strong>Date:</strong> {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} | <strong>Currency:</strong> USD ($)</p>
          </div>
        </div>

        {/* Minimalist Summary Info Box */}
        <div className="grid grid-cols-3 gap-4 p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
          <div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Account Holder / Client</span>
            <strong className="text-sm font-black text-slate-900">{ACCOUNT_DATA.accountName}</strong>
            <span className="text-xs text-amber-700 font-bold block dir-rtl">({ACCOUNT_DATA.accountNameDari})</span>
          </div>
          <div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Ledger Fleet</span>
            <strong className="text-xs font-mono font-bold text-slate-900">{filteredTransactions.length} Activity Rows</strong>
            <span className="text-[10px] text-blue-900 font-bold block">{totals.totalContainers} Containers ({totals.surrenderedCount} Surrendered)</span>
          </div>
          <div className="text-right">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Net Outstanding Balance</span>
            <strong className="text-sm font-black font-mono text-slate-900">{formatUSD(totals.netBalance)}</strong>
            <span className="text-[10px] text-slate-600 font-bold block">
              {totals.netBalance <= 0 ? '(PAID IN FULL / CREDIT)' : '(RECEIVABLE DEBT)'}
            </span>
          </div>
        </div>
      </div>

      {/* 1. COMPACT INTEGRATED HEADER & METRICS BAR (SCREEN VIEW) */}
      <div className="bg-white dark:bg-slate-900 rounded-xl px-3 py-1.5 shadow-2xs border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 shrink-0 no-print">
        
        {/* Left: Branding & Account Title */}
        <div className="flex items-center gap-2.5 min-w-0">
          <img 
            src={logoPath} 
            alt={ACCOUNT_DATA.companyName}
            className="w-8 h-8 object-contain rounded-lg bg-slate-900 p-0.5 border border-blue-500/30 shrink-0"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-xs sm:text-sm font-black tracking-tight truncate text-slate-900 dark:text-slate-100">
                {ACCOUNT_DATA.accountName}
              </h1>
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 dir-rtl hidden sm:inline">
                ({ACCOUNT_DATA.accountNameDari})
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 leading-none">
              <span className="font-semibold text-blue-600 dark:text-blue-400">SKY ARIANA LOGISTICS</span>
              <span>•</span>
              <span className="truncate">Kandahar, AF | Lic: {ACCOUNT_DATA.licenseNo}</span>
            </div>
          </div>
        </div>

        {/* Right: Streamlined KPI Summary Badges */}
        <div className="flex items-center gap-1.5 text-xs shrink-0 overflow-x-auto">
          {/* Credit Billed */}
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 shadow-2xs">
            <ArrowUpCircle size={13} className="text-amber-600 dark:text-amber-400" />
            <div>
              <span className="text-[9px] uppercase font-bold text-slate-400 block leading-tight">Invoices</span>
              <strong className="text-[11px] font-mono font-bold text-amber-800 dark:text-amber-300">
                {formatUSD(totals.totalCredit)}
              </strong>
            </div>
          </div>

          {/* Debit Received */}
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 shadow-2xs">
            <ArrowDownCircle size={13} className="text-emerald-600 dark:text-emerald-400" />
            <div>
              <span className="text-[9px] uppercase font-bold text-slate-400 block leading-tight">Payments</span>
              <strong className="text-[11px] font-mono font-bold text-emerald-800 dark:text-emerald-300">
                {formatUSD(totals.totalDebit)}
              </strong>
            </div>
          </div>

          {/* Net Balance */}
          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg border shadow-2xs ${
            totals.netBalance <= 0 
              ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200/80 text-emerald-800 dark:text-emerald-300' 
              : 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-200/80 text-rose-800 dark:text-rose-300'
          }`}>
            <DollarSign size={13} />
            <div>
              <span className="text-[9px] uppercase font-bold text-slate-400 block leading-tight">Balance</span>
              <strong className="text-[11px] font-mono font-black">
                {formatUSD(totals.netBalance)}
              </strong>
            </div>
          </div>

          {/* Containers & Surrendered B/Ls */}
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 text-blue-800 dark:text-blue-300 shadow-2xs">
            <Container size={13} />
            <div>
              <span className="text-[9px] uppercase font-bold text-slate-400 block leading-tight">Fleet</span>
              <strong className="text-[11px] font-mono font-bold">
                {totals.totalContainers} Units ({totals.surrenderedCount} Surrendered)
              </strong>
            </div>
          </div>
        </div>

      </div>

      {/* 2. COMPACT SEARCH & FILTER CONTROLS TOOLBAR */}
      <div className="bg-white dark:bg-slate-900 rounded-xl px-2.5 py-1.5 shadow-2xs border border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-1.5 shrink-0 no-print">
        
        {/* Search */}
        <div className="relative w-full sm:w-56">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search B/L, Container, Shipper..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-7 pr-2.5 py-1 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100"
          />
        </div>

        {/* Filter Pills & Actions */}
        <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto justify-end">
          <div className="bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg flex items-center text-xs">
            <button
              type="button"
              className={`px-2 py-0.5 rounded-md font-semibold text-[10.5px] transition-all ${
                filterType === 'all' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-2xs' : 'text-slate-500'
              }`}
              onClick={() => setFilterType('all')}
            >
              All ({transactions.length})
            </button>
            <button
              type="button"
              className={`px-2 py-0.5 rounded-md font-semibold text-[10.5px] transition-all ${
                filterType === 'invoice' ? 'bg-white dark:bg-slate-900 text-amber-600 shadow-2xs' : 'text-slate-500'
              }`}
              onClick={() => setFilterType('invoice')}
            >
              Invoices
            </button>
            <button
              type="button"
              className={`px-2 py-0.5 rounded-md font-semibold text-[10.5px] transition-all ${
                filterType === 'payment' ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-2xs' : 'text-slate-500'
              }`}
              onClick={() => setFilterType('payment')}
            >
              Payments
            </button>
            <button
              type="button"
              className={`px-2 py-0.5 rounded-md font-semibold text-[10.5px] transition-all flex items-center gap-1 ${
                filterType === 'surrendered' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-emerald-600 dark:text-emerald-400'
              }`}
              onClick={() => setFilterType('surrendered')}
            >
              <ShieldCheck size={11} />
              <span>Surrendered B/L</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-2xs transition-colors"
          >
            <Plus size={13} />
            <span>New Record</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300"
            title="Export CSV"
          >
            <Download size={13} />
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="p-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300"
            title="Print Statement"
          >
            <Printer size={13} />
          </button>
        </div>

      </div>

      {/* 3. ONE-SCREEN FIT EXPORT TABLE WITH STICKY HEADER */}
      <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-auto relative print:border-none print:shadow-none print:overflow-visible print:w-full print:block print:p-0 print:m-0">
        <table className="w-full text-left text-xs border-collapse min-w-[1000px] print:w-full print:border-collapse print:text-xs print:m-0">
          <thead className="print:table-header-group">
            <tr className="sticky top-0 z-20 bg-slate-100/95 dark:bg-slate-850 text-slate-700 dark:text-slate-200 uppercase font-bold tracking-wider text-[9.5px] border-b border-slate-200 dark:border-slate-700 backdrop-blur-md print:bg-white print:text-slate-500 print:border-b-2 print:border-slate-800">
              <th className="py-1.5 px-2 text-center w-10">S.N</th>
              <th className="py-1.5 px-2 w-20">DATE (تاریخ)</th>
              <th className="py-1.5 px-2 min-w-[110px]">SHIPPER (ارسال کننده)</th>
              <th className="py-1.5 px-2 min-w-[110px]">CONSIGNEE (گیرنده)</th>
              <th className="py-1.5 px-2 min-w-[160px]">COMMODITY & INVOICE</th>
              <th className="py-1.5 px-2 min-w-[160px]">B/L & CONTAINER NO.</th>
              <th className="py-1.5 px-1.5 text-center w-12">QTY</th>
              <th className="py-1.5 px-2 text-right text-amber-700 dark:text-amber-400 print:text-slate-900 w-24">CREDIT ($)</th>
              <th className="py-1.5 px-2 text-right text-emerald-700 dark:text-emerald-400 print:text-rose-600 w-24">DEBIT ($)</th>
              <th className="py-1.5 px-2 text-right text-slate-800 dark:text-slate-200 print:text-slate-900 w-28">BALANCE ($)</th>
              <th className="py-1.5 px-1.5 text-center w-16 no-print">ACTIONS</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-[10.5px] print:table-row-group">
            {filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={11} className="py-8 text-center text-slate-400 text-xs">
                  No matching export records found.
                </td>
              </tr>
            ) : (
              filteredTransactions.map((tx) => {
                const isPayment = tx.type === 'payment';
                return (
                  <tr 
                    key={tx.id} 
                    className={`hover:bg-blue-50/40 dark:hover:bg-slate-800/50 transition-colors print:break-inside-avoid print:page-break-inside-avoid ${
                      isPayment ? 'bg-emerald-50/30 dark:bg-emerald-950/15' : ''
                    }`}
                  >
                    {/* S.N */}
                    <td className="py-1.5 px-2 text-center text-slate-400 font-bold font-mono">
                      {tx.sn}
                    </td>

                    {/* Date */}
                    <td className="py-1.5 px-2 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap text-[10px]">
                      {tx.date}
                    </td>

                    {/* Shipper */}
                    <td className="py-1.5 px-2 font-semibold text-slate-900 dark:text-slate-100 truncate" title={tx.shipper}>
                      {tx.shipper || 'N/A'}
                    </td>

                    {/* Consignee */}
                    <td className="py-1.5 px-2 text-slate-700 dark:text-slate-300 truncate" title={tx.consignee}>
                      {tx.consignee || 'N/A'}
                    </td>

                    {/* Commodity & Invoice */}
                    <td className="py-1.5 px-2">
                      <div className="font-bold text-slate-900 dark:text-slate-100 truncate" title={tx.commodityInvoice}>
                        {tx.commodityInvoice}
                      </div>
                      {tx.notes && (
                        <div className="text-[9.5px] text-emerald-600 dark:text-emerald-400 font-sans truncate dir-rtl" title={tx.notes}>
                          {tx.notes}
                        </div>
                      )}
                    </td>

                    {/* B/L & Container + SURRENDERED BADGE */}
                    <td className="py-1.5 px-2">
                      <div className="font-mono text-slate-700 dark:text-slate-300 text-[10.5px] truncate" title={tx.blContainer}>
                        {tx.blContainer || '-'}
                      </div>
                      {tx.isSurrenderedBL && (
                        <div className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[8.5px] font-bold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-800/80 mt-0.5 tracking-wider">
                          <ShieldCheck size={10} />
                          <span>SURRENDERED B/L</span>
                        </div>
                      )}
                    </td>

                    {/* Qty */}
                    <td className="py-1.5 px-1.5 text-center font-bold">
                      {tx.quantity > 0 ? (
                        <span className="px-1.5 py-0.2 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60 font-mono text-[9.5px] tabular-nums">
                          {tx.quantity}
                        </span>
                      ) : '-'}
                    </td>

                    {/* Credit (USD) */}
                    <td className="py-1.5 px-2 text-right font-mono tabular-nums font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">
                      {tx.creditUSD > 0 ? formatUSD(tx.creditUSD) : '-'}
                    </td>

                    {/* Debit (USD) */}
                    <td className="py-1.5 px-2 text-right font-mono tabular-nums font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                      {tx.debitUSD > 0 ? formatUSD(tx.debitUSD) : '-'}
                    </td>

                    {/* Running Balance (USD) */}
                    <td className={`py-1.5 px-2 text-right font-mono tabular-nums font-black text-[11px] whitespace-nowrap ${
                      tx.balanceUSD <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'
                    }`}>
                      {formatUSD(tx.balanceUSD)}
                    </td>

                    {/* Actions Column (Edit / Delete) */}
                    <td className="py-1.5 px-1.5 text-center whitespace-nowrap no-print">
                      <div className="flex items-center justify-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(tx)}
                          className="p-0.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-colors"
                          title="Edit Record"
                        >
                          <SquarePen size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTransaction(tx.id)}
                          className="p-0.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition-colors"
                          title="Delete Record"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {/* Sticky Table Footer Summary */}
          <tfoot className="sticky bottom-0 z-20 bg-slate-100/95 dark:bg-slate-900/95 text-slate-900 dark:text-slate-100 font-bold border-t-2 border-slate-300 dark:border-slate-700 text-xs shadow-md backdrop-blur-md">
            <tr>
              <td colSpan={6} className="py-1.5 px-2 text-right uppercase text-[10px] font-black tracking-wider text-slate-700 dark:text-slate-300">
                Totals ({filteredTransactions.length} items):
              </td>
              <td className="py-1.5 px-1 text-center font-mono text-blue-700 dark:text-blue-400 font-black">
                {totals.totalContainers}
              </td>
              <td className="py-1.5 px-2 text-right font-mono text-amber-700 dark:text-amber-400 font-black">
                {formatUSD(totals.totalCredit)}
              </td>
              <td className="py-1.5 px-2 text-right font-mono text-emerald-700 dark:text-emerald-400 font-black">
                {formatUSD(totals.totalDebit)}
              </td>
              <td className={`py-1.5 px-2 text-right font-mono font-black ${
                totals.netBalance <= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
              }`}>
                {formatUSD(totals.netBalance)}
              </td>
              <td className="py-1.5 px-1 text-center no-print">-</td>
            </tr>
          </tfoot>

        </table>
      </div>

      {/* PRINT-ONLY EXECUTIVE SIGNATURE & STAMP FOOTER */}
      <div className="hidden print:flex flex-col gap-2 mt-2 pt-2 border-t border-slate-900 text-xs font-sans break-inside-avoid page-break-inside-avoid">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="h-7 border-b border-slate-400"></div>
            <span className="text-[9.5px] font-bold uppercase text-slate-800 block mt-0.5">Prepared By (ترتيب کننده)</span>
            <span className="text-[8.5px] text-slate-500">Logistics & Accounting Dept</span>
          </div>
          <div>
            <div className="h-7 border-b border-slate-400"></div>
            <span className="text-[9.5px] font-bold uppercase text-slate-800 block mt-0.5">Approved Manager (منظوری اداره)</span>
            <span className="text-[8.5px] text-slate-500">SKY ARIANA LTD Authority</span>
          </div>
          <div>
            <div className="h-7 border-b border-slate-400"></div>
            <span className="text-[9.5px] font-bold uppercase text-slate-800 block mt-0.5">Client Confirmation (تائیدی مشتری)</span>
            <span className="text-[8.5px] text-slate-500">{ACCOUNT_PROFILE.accountName}</span>
          </div>
        </div>

        <div className="text-center text-[8px] text-slate-500 font-sans border-t border-slate-200 pt-1">
          <p>Official Statement of Account issued by SKY ARIANA LTD. All freight charges, container surrendered B/Ls, and Hawala payments recorded herein are verified against shipping manifests.</p>
        </div>
      </div>

      {/* 4. ADD / EDIT RECORD MODAL COMPONENT */}
      <NewExportTransactionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingId(null);
        }}
        onSave={(payload) => {
          let updatedList = [];
          if (editingId !== null) {
            updatedList = transactions.map(tx => (tx.id === editingId ? { ...tx, ...payload } : tx));
          } else {
            updatedList = [...transactions, payload];
          }
          setTransactions(recalculateBalances(updatedList));
          setEditingId(null);
          setIsModalOpen(false);
        }}
        initialData={transactions.find(t => t.id === editingId) || null}
        clientName={ACCOUNT_PROFILE.accountName}
      />

      {/* 5. GLASS PRINT PREVIEW MODAL */}
      {isPrintPreviewOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-2 sm:p-4 no-print animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-7xl h-[95vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-600/20 border border-blue-500/30 text-blue-400">
                  <Printer size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white tracking-tight uppercase">
                    Export Statement Print Preview
                  </h3>
                  <p className="text-xs text-slate-400 font-medium">
                    {ACCOUNT_DATA.accountName} · A4 Landscape Official Letterhead
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={executePrint}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/20 transition-all hover:scale-[1.02]"
                >
                  <Printer size={15} />
                  <span>Print Document</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition-colors"
                >
                  <Download size={15} />
                  <span>Export CSV</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintPreviewOpen(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
                  title="Close Preview"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body: Live Rendered Iframe */}
            <div className="flex-1 bg-slate-950 p-4 overflow-hidden flex items-center justify-center">
              <iframe
                title="Export Ledger Print Preview"
                srcDoc={generateExportLedgerPrintHtml({
                  account: ACCOUNT_DATA,
                  transactions: filteredTransactions,
                  totals,
                  companyName: currentCompany?.name || 'SKY ARIANA LTD',
                  companyLogo: logoPath
                })}
                className="w-full h-full rounded-xl bg-white border border-slate-800 shadow-2xl"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
