import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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
  ShieldCheck,
  Banknote
} from 'lucide-react';
import { useCompany } from '../../context/CompanyContext';

export default function TransportLedgerTable() {
  const { currentCompany } = useCompany();
  const { t } = useTranslation();
  const [ledgerEntries, setLedgerEntries] = useState([
    {
      id: 'tx-1',
      sn: 1,
      date: '2026-02-28',
      shipper: 'NAJEB-AMIN LTD',
      consignee: 'MIDA ENTERPRISES',
      commodityInvoice: '2300 CNT GREEN RAISINS (INV: 002)',
      blContainerNo: 'RXTU4545407 (1X40 HC) / JADSUHN5A33481',
      containerQty: 1,
      ratePerContainerUSD: 2050,
      creditUSD: 2050,
      debitUSD: 0,
      runningBalanceUSD: 2050,
      type: 'FREIGHT_INVOICE',
      isSurrenderedBL: true
    },
    {
      id: 'tx-2',
      sn: 2,
      date: '2026-02-27',
      shipper: 'NAJEB-AMIN LTD',
      consignee: 'MIDA ENTERPRISES',
      commodityInvoice: '2315 CNT GREEN RAISINS (INV: 001)',
      blContainerNo: 'PCIU8304571 (1X40 HC) / BWSBNONSA2009231',
      containerQty: 1,
      ratePerContainerUSD: 18540,
      creditUSD: 18540,
      debitUSD: 0,
      runningBalanceUSD: 20590,
      type: 'FREIGHT_INVOICE',
      isSurrenderedBL: true
    },
    {
      id: 'tx-3',
      sn: 3,
      date: '2026-04-20',
      shipper: 'نقدی په دوبی کی دانش بیای راته جعمه کړی',
      consignee: 'DUBAI CASH DROP',
      commodityInvoice: 'Dubai Cash Deposit by Danish Agha',
      blContainerNo: 'HAWALA / CASH / DUB-0420',
      containerQty: 0,
      ratePerContainerUSD: 0,
      creditUSD: 0,
      debitUSD: 20000,
      runningBalanceUSD: 590,
      type: 'HAWALA_PAYMENT',
      notesDari: 'نقدی په دوبی کی دانش بیای راته جعمه کړی',
      isSurrenderedBL: false
    }
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  // Modal State for Add / Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [entryType, setEntryType] = useState('FREIGHT_INVOICE');
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    shipper: '',
    consignee: '',
    commodityInvoice: '',
    blContainerNo: '',
    containerQty: 1,
    ratePerContainerUSD: 18540,
    debitUSD: 0,
    notesDari: '',
    isSurrenderedBL: false
  });

  const recalculateBalances = (dataList) => {
    let currentBal = 0;
    return dataList.map((tx, idx) => {
      const credit = tx.creditUSD || 0;
      const debit = tx.debitUSD || 0;
      currentBal += (credit - debit);
      return {
        ...tx,
        sn: idx + 1,
        runningBalanceUSD: currentBal
      };
    });
  };

  // Filtered Entries
  const filteredData = useMemo(() => {
    return ledgerEntries.filter(entry => {
      if (filterCategory === 'FREIGHT_INVOICE' && entry.type !== 'FREIGHT_INVOICE') return false;
      if (filterCategory === 'HAWALA_PAYMENT' && entry.type !== 'HAWALA_PAYMENT') return false;
      if (filterCategory === 'SURRENDERED' && !entry.isSurrenderedBL) return false;

      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      return (
        entry.date.toLowerCase().includes(q) ||
        entry.shipper.toLowerCase().includes(q) ||
        entry.consignee.toLowerCase().includes(q) ||
        entry.commodityInvoice.toLowerCase().includes(q) ||
        entry.blContainerNo.toLowerCase().includes(q) ||
        (entry.notesDari && entry.notesDari.toLowerCase().includes(q))
      );
    });
  }, [ledgerEntries, searchTerm, filterCategory]);

  // Aggregate Metrics
  const summary = useMemo(() => {
    let credit = 0;
    let debit = 0;
    let containers = 0;

    ledgerEntries.forEach(item => {
      credit += item.creditUSD || 0;
      debit += item.debitUSD || 0;
      containers += item.containerQty || 0;
    });

    return {
      totalCreditUSD: credit,
      totalDebitUSD: debit,
      netBalanceUSD: credit - debit,
      totalContainers: containers
    };
  }, [ledgerEntries]);

  // Formatter for USD Currency
  const formatUSD = (val) => {
    if (!val && val !== 0) return '$0.00';
    const isNeg = val < 0;
    const formatted = Math.abs(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return isNeg ? `-$${formatted}` : `$${formatted}`;
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setEntryType('FREIGHT_INVOICE');
    setFormData({
      date: new Date().toISOString().split('T')[0],
      shipper: '',
      consignee: '',
      commodityInvoice: '',
      blContainerNo: '',
      containerQty: 1,
      ratePerContainerUSD: 18540,
      debitUSD: 0,
      notesDari: '',
      isSurrenderedBL: false
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (entry) => {
    setEditingId(entry.id);
    setEntryType(entry.type || 'FREIGHT_INVOICE');
    setFormData({
      date: entry.date,
      shipper: entry.shipper,
      consignee: entry.consignee,
      commodityInvoice: entry.commodityInvoice,
      blContainerNo: entry.blContainerNo,
      containerQty: entry.containerQty || 1,
      ratePerContainerUSD: entry.ratePerContainerUSD || 18540,
      debitUSD: entry.debitUSD || 0,
      notesDari: entry.notesDari || '',
      isSurrenderedBL: !!entry.isSurrenderedBL
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Delete this transport entry?')) {
      const updated = ledgerEntries.filter(e => e.id !== id);
      setLedgerEntries(recalculateBalances(updated));
    }
  };

  // Add / Edit Entry Handler
  const handleSaveEntry = (e) => {
    e.preventDefault();
    const isInvoice = entryType === 'FREIGHT_INVOICE';
    const qty = isInvoice ? (parseInt(formData.containerQty) || 1) : 0;
    const rate = isInvoice ? (parseFloat(formData.ratePerContainerUSD) || 0) : 0;
    const creditUSD = isInvoice ? qty * rate : 0;
    const debitUSD = !isInvoice ? (parseFloat(formData.debitUSD) || 0) : 0;

    let updatedList = [];

    if (editingId) {
      updatedList = ledgerEntries.map(entry => {
        if (entry.id === editingId) {
          return {
            ...entry,
            type: entryType,
            date: formData.date,
            shipper: formData.shipper || (isInvoice ? 'NAJEB-AMIN LTD' : 'DUBAI CASH DROP'),
            consignee: formData.consignee || (isInvoice ? 'MIDA ENTERPRISES' : 'HAWALA CLEARING'),
            commodityInvoice: formData.commodityInvoice || (isInvoice ? 'FREIGHT INVOICE' : 'HAWALA CASH DEPOSIT'),
            blContainerNo: formData.blContainerNo || (isInvoice ? '1X40 HC / BL-PENDING' : 'HAWALA / CASH'),
            containerQty: qty,
            ratePerContainerUSD: rate,
            creditUSD,
            debitUSD,
            notesDari: formData.notesDari,
            isSurrenderedBL: isInvoice ? formData.isSurrenderedBL : false
          };
        }
        return entry;
      });
    } else {
      const newEntry = {
        id: `tx-${Date.now()}`,
        sn: ledgerEntries.length + 1,
        date: formData.date,
        shipper: formData.shipper || (isInvoice ? 'NAJEB-AMIN LTD' : 'DUBAI CASH DROP'),
        consignee: formData.consignee || (isInvoice ? 'MIDA ENTERPRISES' : 'HAWALA CLEARING'),
        commodityInvoice: formData.commodityInvoice || (isInvoice ? 'FREIGHT INVOICE' : 'HAWALA CASH DEPOSIT'),
        blContainerNo: formData.blContainerNo || (isInvoice ? '1X40 HC / BL-PENDING' : 'HAWALA / CASH'),
        containerQty: qty,
        ratePerContainerUSD: rate,
        creditUSD,
        debitUSD,
        runningBalanceUSD: 0,
        type: entryType,
        notesDari: formData.notesDari,
        isSurrenderedBL: isInvoice ? formData.isSurrenderedBL : false
      };
      updatedList = [...ledgerEntries, newEntry];
    }

    setLedgerEntries(recalculateBalances(updatedList));
    setIsModalOpen(false);
  };

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col gap-2 p-2.5 sm:p-3 bg-slate-100/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans">
      
      {/* 1. COMPACT LIGHT THEME CORPORATE HEADER BAR */}
      <div className="bg-white dark:bg-slate-900 rounded-xl px-3.5 py-1.5 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5">
          <img src={currentCompany?.logo || '/sky-ariana-logo.png'} alt="SKY ARIANA" className="w-8 h-8 object-contain rounded-lg bg-slate-900 border border-blue-500/40 p-0.5 shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[9.5px] font-black uppercase bg-blue-600 px-1.5 py-0.2 rounded text-white tracking-wider">
                {t('ledger.companyBrand', 'SKY ARIANA & BALAM BAR BARAN')}
              </span>
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 dir-rtl hidden sm:inline">حاجی ابراهیم او دانش بهای</span>
            </div>
            <h1 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white tracking-tight">HAJI IBRAHIM - DANISH AGHA</h1>
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-xs shrink-0">
          <div className="px-2 py-0.5 rounded-lg bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 shadow-2xs">
            <span className="text-[9px] uppercase font-bold text-slate-400 block leading-tight">{t('ledger.credit', 'Credit')}</span>
            <strong className="text-[11px] font-mono font-bold text-amber-800 dark:text-amber-300">{formatUSD(summary.totalCreditUSD)}</strong>
          </div>
          <div className="px-2 py-0.5 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 shadow-2xs">
            <span className="text-[9px] uppercase font-bold text-slate-400 block leading-tight">{t('ledger.debit', 'Debit')}</span>
            <strong className="text-[11px] font-mono font-bold text-emerald-800 dark:text-emerald-300">{formatUSD(summary.totalDebitUSD)}</strong>
          </div>
          <div className="px-2 py-0.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
            <span className="text-[9px] uppercase font-bold text-slate-400 block leading-tight">{t('ledger.balance', 'Balance')}</span>
            <strong className={`text-[11px] font-mono font-black ${summary.netBalanceUSD <= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
              {formatUSD(summary.netBalanceUSD)}
            </strong>
          </div>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-2xs transition-all active:scale-[0.98]"
          >
            <Plus size={13} />
            <span>{t('ledger.newEntry', 'New Entry')}</span>
          </button>
        </div>
      </div>

      {/* 2. COMPACT SEARCH TOOLBAR */}
      <div className="bg-white dark:bg-slate-900 rounded-xl px-2.5 py-1.5 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between gap-2 shrink-0">
        <div className="relative w-48 sm:w-56">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search B/L, Container..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-7 pr-2.5 py-1 text-xs rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500"
          />
        </div>

        <div className="bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg flex items-center text-xs">
          <button
            type="button"
            className={`px-2 py-0.5 rounded-md font-semibold text-[10.5px] transition-all ${filterCategory === 'all' ? 'bg-white dark:bg-slate-900 text-blue-600 shadow-2xs' : 'text-slate-500'}`}
            onClick={() => setFilterCategory('all')}
          >
            {t('ledger.all', 'All')}
          </button>
          <button
            type="button"
            className={`px-2 py-0.5 rounded-md font-semibold text-[10.5px] transition-all ${filterCategory === 'FREIGHT_INVOICE' ? 'bg-white dark:bg-slate-900 text-amber-600 shadow-2xs' : 'text-slate-500'}`}
            onClick={() => setFilterCategory('FREIGHT_INVOICE')}
          >
            {t('ledger.invoices', 'Invoices')}
          </button>
          <button
            type="button"
            className={`px-2 py-0.5 rounded-md font-semibold text-[10.5px] transition-all ${filterCategory === 'HAWALA_PAYMENT' ? 'bg-white dark:bg-slate-900 text-emerald-600 shadow-2xs' : 'text-slate-500'}`}
            onClick={() => setFilterCategory('HAWALA_PAYMENT')}
          >
            {t('ledger.hawala', 'Hawala')}
          </button>
          <button
            type="button"
            className={`px-2 py-0.5 rounded-md font-semibold text-[10.5px] transition-all flex items-center gap-1 ${filterCategory === 'SURRENDERED' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-emerald-600 dark:text-emerald-400'}`}
            onClick={() => setFilterCategory('SURRENDERED')}
          >
            <ShieldCheck size={11} />
            <span>{t('ledger.surrenderedBL', 'Surrendered B/L')}</span>
          </button>
        </div>
      </div>

      {/* 3. STICKY LEDGER TABLE (HIGH-DENSITY LIGHT THEME) */}
      <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs overflow-auto relative">
        <table className="w-full text-left text-xs border-collapse min-w-[950px]">
          <thead>
            <tr className="sticky top-0 z-20 bg-slate-100/95 dark:bg-slate-850 text-slate-700 dark:text-slate-200 uppercase font-bold text-[9.5px] tracking-wider border-b border-slate-200 dark:border-slate-700 backdrop-blur-md">
              <th className="py-1.5 px-2 text-center w-10">S.N</th>
              <th className="py-1.5 px-2 min-w-[80px]">{t('ledger.date', 'Date')}</th>
              <th className="py-1.5 px-2 min-w-[120px]">{t('ledger.shipper', 'Shipper')}</th>
              <th className="py-1.5 px-2 min-w-[120px]">{t('ledger.consignee', 'Consignee')}</th>
              <th className="py-1.5 px-2 min-w-[160px]">{t('ledger.commodityInvoice', 'Commodity & Invoice')}</th>
              <th className="py-1.5 px-2 min-w-[190px]">{t('ledger.containerBLNo', 'Container & B/L No.')}</th>
              <th className="py-1.5 px-1.5 text-center w-10">{t('ledger.qty', 'Qty')}</th>
              <th className="py-1.5 px-2 text-right text-slate-500 dark:text-slate-400 min-w-[80px]">{t('ledger.rateUSD', 'Rate ($)')}</th>
              <th className="py-1.5 px-2 text-right text-amber-700 dark:text-amber-400 min-w-[85px]">{t('ledger.creditUSD', 'Credit ($)')}</th>
              <th className="py-1.5 px-2 text-right text-emerald-700 dark:text-emerald-400 min-w-[85px]">{t('ledger.debitUSD', 'Debit ($)')}</th>
              <th className="py-1.5 px-2 text-right text-slate-800 dark:text-slate-200 min-w-[90px]">{t('ledger.balanceUSD', 'Balance ($)')}</th>
              <th className="py-1.5 px-1.5 text-center w-14">{t('ledger.actions', 'Actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-[10.5px]">
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan={12} className="py-8 text-center text-slate-400 text-xs">
                  {t('ledger.noEntriesFound', 'No matching ledger entries found.')}
                </td>
              </tr>
            ) : (
              filteredData.map((row) => (
                <tr 
                  key={row.id} 
                  className={`hover:bg-blue-50/40 dark:hover:bg-slate-800/50 transition-colors ${
                    row.type === 'HAWALA_PAYMENT' ? 'bg-emerald-50/30 dark:bg-emerald-950/15' : ''
                  }`}
                >
                  <td className="py-1.5 px-2 text-center font-mono text-slate-400 font-bold">{row.sn}</td>
                  <td className="py-1.5 px-2 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap text-[10px]">{row.date}</td>
                  <td className="py-1.5 px-2 font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[120px]" title={row.shipper}>{row.shipper}</td>
                  <td className="py-1.5 px-2 text-slate-700 dark:text-slate-300 truncate max-w-[120px]" title={row.consignee}>{row.consignee}</td>
                  <td className="py-1.5 px-2 font-bold text-slate-900 dark:text-slate-100 truncate max-w-[160px]" title={row.commodityInvoice}>{row.commodityInvoice}</td>
                  <td className="py-1.5 px-2 font-mono text-[10.5px]">
                    <div className="text-slate-700 dark:text-slate-300 truncate" title={row.blContainerNo}>{row.blContainerNo}</div>
                    {row.isSurrenderedBL && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[8.5px] font-bold uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300/80 dark:border-emerald-800/80 mt-0.5">
                        <ShieldCheck size={10} /> {t('ledger.surrenderedBL', 'SURRENDERED B/L')}
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 px-1.5 text-center font-bold">
                    {row.containerQty > 0 ? (
                      <span className="px-1.5 py-0.2 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60 font-mono text-[9.5px] tabular-nums">
                        {row.containerQty}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="py-1.5 px-2 text-right font-mono text-slate-500 dark:text-slate-400 tabular-nums">{row.ratePerContainerUSD > 0 ? formatUSD(row.ratePerContainerUSD) : '-'}</td>
                  <td className="py-1.5 px-2 text-right font-mono font-bold text-slate-900 dark:text-slate-100 tabular-nums">{row.creditUSD > 0 ? formatUSD(row.creditUSD) : '-'}</td>
                  <td className="py-1.5 px-2 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">{row.debitUSD > 0 ? formatUSD(row.debitUSD) : '-'}</td>
                  <td className={`py-1.5 px-2 text-right font-mono font-black tabular-nums text-[11px] ${row.runningBalanceUSD <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-slate-100'}`}>{formatUSD(row.runningBalanceUSD)}</td>
                  <td className="py-1.5 px-1.5 text-center">
                    <div className="flex items-center justify-center gap-0.5">
                      <button type="button" onClick={() => handleOpenEdit(row)} className="p-0.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded transition-colors" title="Edit Entry">
                        <SquarePen size={13} />
                      </button>
                      <button type="button" onClick={() => handleDelete(row.id)} className="p-0.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded transition-colors" title="Delete Entry">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {/* Sticky Table Footer Summary */}
          <tfoot className="sticky bottom-0 z-20 bg-slate-100/95 dark:bg-slate-900/95 text-slate-900 dark:text-slate-100 font-bold border-t-2 border-slate-300 dark:border-slate-700 text-xs shadow-md backdrop-blur-md">
            <tr>
              <td colSpan={6} className="py-1.5 px-2 text-right uppercase text-[10px] font-black tracking-wider text-slate-700 dark:text-slate-300">
                {t('ledger.totalsPrefix', 'Totals (')} {filteredData.length} entries):
              </td>
              <td className="py-1.5 px-1.5 text-center font-mono text-blue-700 dark:text-blue-400 font-black">
                {summary.totalContainers}
              </td>
              <td className="py-1.5 px-2 text-right font-mono text-slate-500 dark:text-slate-400 font-bold">-</td>
              <td className="py-1.5 px-2 text-right font-mono text-amber-700 dark:text-amber-400 font-black">
                {formatUSD(summary.totalCreditUSD)}
              </td>
              <td className="py-1.5 px-2 text-right font-mono text-emerald-700 dark:text-emerald-400 font-black">
                {formatUSD(summary.totalDebitUSD)}
              </td>
              <td className={`py-1.5 px-2 text-right font-mono font-black ${
                summary.netBalanceUSD <= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'
              }`}>
                {formatUSD(summary.netBalanceUSD)}
              </td>
              <td className="py-1.5 px-1 text-center">-</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* MODAL WITH SURRENDERED B/L CHECKBOX */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg p-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2 mb-3">
              <h3 className="text-xs sm:text-sm font-bold">{editingId ? t('ledger.editRecord', 'Edit Transport Record') : t('ledger.addRecord', 'Add Transport Record')}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white"><X size={15} /></button>
            </div>

            <form onSubmit={handleSaveEntry} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">{t('ledger.typeLabel', 'Type')}</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" className={`py-1.5 rounded-lg font-bold transition-all ${entryType === 'FREIGHT_INVOICE' ? 'bg-amber-600 text-white shadow-2xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`} onClick={() => setEntryType('FREIGHT_INVOICE')}>
                    {t('ledger.invoiceCredit', 'Invoice (Credit)')}
                  </button>
                  <button type="button" className={`py-1.5 rounded-lg font-bold transition-all ${entryType === 'HAWALA_PAYMENT' ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'}`} onClick={() => setEntryType('HAWALA_PAYMENT')}>
                    {t('ledger.hawalaDebit', 'Hawala (Debit)')}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">{t('ledger.date', 'Date')}</label>
                  <input type="text" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white" />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-slate-700 dark:text-slate-300">{entryType === 'FREIGHT_INVOICE' ? t('ledger.rateUSD', 'Rate ($)') : 'Amount ($)'}</label>
                  <input type="number" value={entryType === 'FREIGHT_INVOICE' ? formData.ratePerContainerUSD : formData.debitUSD} onChange={(e) => setFormData({ ...formData, [entryType === 'FREIGHT_INVOICE' ? 'ratePerContainerUSD' : 'debitUSD']: e.target.value })} className="w-full p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-mono font-bold" />
                </div>
              </div>

              {entryType === 'FREIGHT_INVOICE' && (
                <label className="flex items-center gap-2 p-2 rounded-lg border border-emerald-300/80 bg-emerald-50 dark:bg-emerald-950/20 cursor-pointer">
                  <input type="checkbox" checked={formData.isSurrenderedBL} onChange={(e) => setFormData({ ...formData, isSurrenderedBL: e.target.checked })} className="rounded text-emerald-600 focus:ring-emerald-500" />
                  <span className="font-bold text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-1">
                    <ShieldCheck size={14} /> {t('ledger.surrenderedBLDetailed', 'Surrendered B/L (Telex Release / تسلیم شده)')}
                  </span>
                </label>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-3 py-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-semibold">{t('ledger.cancel', 'Cancel')}</button>
                <button type="submit" className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-2xs">{editingId ? t('ledger.update', 'Update') : t('ledger.save', 'Save')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
