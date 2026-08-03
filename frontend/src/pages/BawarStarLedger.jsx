import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Factory, 
  Plus, 
  TrendingUp, 
  Scale, 
  Truck, 
  Box, 
  DollarSign, 
  Search, 
  Trash2, 
  Printer, 
  RefreshCw,
  Building2,
  PieChart,
  ArrowUpRight,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { api } from '../services/api';
import QuickAddBawarStarModal from '../components/bawar_star/QuickAddBawarStarModal';
import { useToast } from '../components/ToastProvider';

function isBawarAccountName(name) {
  if (!name || typeof name !== 'string') return false;
  const s = name.toLowerCase();
  return s.includes('bawar') || s.includes('factory') || s.includes('plastic') || s.includes('preform') || s.includes('foctory') || s.includes('rent');
}

export default function BawarStarLedger() {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();
  const urlPartnerId = searchParams.get('partnerId');

  const [accounts, setAccounts] = useState([]);
  const [selectedPartnerId, setSelectedPartnerId] = useState('');
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch accounts list on mount
  useEffect(() => {
    fetchAccounts();
  }, []);

  // Fetch ledger data when selected partner changes
  useEffect(() => {
    if (selectedPartnerId) {
      fetchLedgerData(selectedPartnerId);
    } else {
      setSummary(null);
      setTransactions([]);
    }
  }, [selectedPartnerId]);

  const fetchAccounts = async () => {
    try {
      const data = await api.getAccounts();
      setAccounts(data || []);
      if (data && data.length > 0 && !selectedPartnerId) {
        if (urlPartnerId && data.some(a => String(a.id) === String(urlPartnerId))) {
          setSelectedPartnerId(String(urlPartnerId));
        } else {
          const bawarAcc = data.find(a => isBawarAccountName(a.name));
          setSelectedPartnerId(bawarAcc ? String(bawarAcc.id) : String(data[0].id));
        }
      }
    } catch (err) {
      console.error('Failed to load accounts:', err);
    }
  };

  const fetchLedgerData = async (partnerId) => {
    setLoading(true);
    try {
      const [sumRes, txRes] = await Promise.all([
        api.getBawarStarSummary(partnerId),
        api.getBawarStarTransactions(partnerId)
      ]);
      setSummary(sumRes);
      setTransactions(txRes || []);
    } catch (err) {
      console.error('Error fetching Bawar Star ledger:', err);
      showToast?.('Error loading Bawar Star ledger data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTransaction = async (payload) => {
    await api.createBawarStarTransaction(payload);
    showToast?.('Transaction recorded successfully', 'success');
    if (selectedPartnerId) {
      fetchLedgerData(selectedPartnerId);
    }
  };

  const handleDeleteTransaction = async (id) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return;
    try {
      await api.deleteBawarStarTransaction(id);
      showToast?.('Transaction deleted', 'info');
      if (selectedPartnerId) {
        fetchLedgerData(selectedPartnerId);
      }
    } catch (err) {
      showToast?.(err.message || 'Failed to delete', 'error');
    }
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const matchesSearch = 
        !searchQuery ||
        tx.description_en?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.description_ps?.includes(searchQuery) ||
        tx.id.toString().includes(searchQuery);

      const matchesType = typeFilter === 'ALL' || tx.transaction_type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [transactions, searchQuery, typeFilter]);

  const selectedPartner = accounts.find(a => a.id === parseInt(selectedPartnerId, 10));

  const getTypeBadge = (type) => {
    switch (type) {
      case 'SELL_PRODUCT':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            {t('bawarStar.productSale', 'Product Sale')}
          </span>
        );
      case 'PASS_THROUGH_FREIGHT':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            {t('bawarStar.freightLogistics', 'Freight / Logistics')}
          </span>
        );
      case 'PASS_THROUGH_PKG':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            {t('bawarStar.packaging', 'Packaging')}
          </span>
        );
      case 'PAYMENT_RECEIVED':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            {t('bawarStar.paymentReceived', 'Payment Received')}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
            {type}
          </span>
        );
    }
  };

  const sortedAccounts = useMemo(() => {
    return [...accounts].sort((a, b) => {
      const aBawar = isBawarAccountName(a.name);
      const bBawar = isBawarAccountName(b.name);
      if (aBawar && !bBawar) return -1;
      if (!aBawar && bBawar) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [accounts]);

  return (
    <div className="h-[calc(100vh-105px)] flex flex-col gap-3 p-2 sm:p-4 max-w-[1700px] mx-auto overflow-hidden text-slate-900 dark:text-slate-100 font-sans">
      
      {/* Header Banner (macOS Aesthetic) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 p-4 sm:p-5 shadow-lg text-white shrink-0">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg border border-blue-400/30 shrink-0">
              <Factory className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-md bg-blue-500/20 border border-blue-400/30 text-blue-300 font-bold text-[10px] uppercase tracking-wider">
                  {t('bawarStar.manufacturingModule', 'Manufacturing Module')}
                </span>
                <span className="text-xs text-slate-400">{t('bawarStar.plasticIndustry', 'Bawar Star Plastic Industry')}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">
                {t('bawarStar.advancedLedgerTitle', 'Advanced Ledger & Profit Calculator')}
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 mt-1 dir-rtl text-right font-medium">
                د باوار سټار پلاستیک تولیدي باقې‌داري، پریفارم، کرایه او ګټې محاسبه
              </p>
            </div>
          </div>

          {/* Action Header controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <select
                value={selectedPartnerId}
                onChange={(e) => setSelectedPartnerId(e.target.value)}
                className="h-11 pl-10 pr-8 rounded-2xl bg-slate-800/90 border border-slate-700 text-white text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none backdrop-blur-md cursor-pointer min-w-[220px]"
              >
                <option value="">{t('bawarStar.selectPartner', 'Select Customer / Partner')}</option>
                {sortedAccounts.map(acc => {
                  const isBawar = isBawarAccountName(acc.name);
                  return (
                    <option key={acc.id} value={acc.id}>
                      {isBawar ? '🏭 ' : ''}{acc.name} ({acc.account_type || 'Account'})
                    </option>
                  );
                })}
              </select>
              <Building2 className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
            </div>

            <button
              onClick={() => setSelectedPartnerId(selectedPartnerId)}
              className="w-11 h-11 rounded-2xl bg-slate-800/80 border border-slate-700 hover:bg-slate-700/80 flex items-center justify-center text-slate-300 hover:text-white transition-all shadow-sm"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => window.print()}
              className="h-11 px-4 rounded-2xl bg-slate-800/80 border border-slate-700 hover:bg-slate-700/80 text-slate-200 hover:text-white text-xs font-semibold flex items-center space-x-2 transition-all shadow-sm"
            >
              <Printer className="w-4 h-4" />
              <span>{t('bawarStar.printLedger', 'Print Ledger')}</span>
            </button>

            <button
              onClick={() => setIsModalOpen(true)}
              className="h-11 px-5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center space-x-2 shadow-lg shadow-blue-600/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <Plus className="w-4.5 h-4.5" />
              <span>{t('bawarStar.quickAddEntry', 'Quick Add Entry')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* TOP SUMMARY DASHBOARD CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 shrink-0">
        
        {/* CARD 1: OUTSTANDING BALANCE */}
        <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {t('bawarStar.netOutstandingBalance', 'Net Outstanding Balance')}
            </span>
            <div className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
              <Scale className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-2">
            <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {(summary?.net_outstanding_balance || 0).toLocaleString()} <span className="text-xs font-semibold text-slate-400">{t('bawarStar.afn', 'AFN')}</span>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-medium">
            <span className="text-slate-500">{t('bawarStar.billed', 'Billed:')} <strong className="text-slate-800 dark:text-slate-200">{(summary?.total_billed_amount || 0).toLocaleString()}</strong></span>
            <span className="text-slate-500">{t('bawarStar.paid', 'Paid:')} <strong className="text-emerald-600 dark:text-emerald-400">{(summary?.total_payments_received || 0).toLocaleString()}</strong></span>
          </div>
        </div>

        {/* CARD 2: REVENUE SPLIT (Manufacturing vs Pass-Through) */}
        <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {t('bawarStar.revenueBreakdown', 'Revenue Breakdown')}
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
              <PieChart className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-2">
            <div className="text-xl font-bold text-slate-900 dark:text-white">
              {(summary?.revenue_split?.product_revenue || 0).toLocaleString()} <span className="text-xs font-normal text-slate-400">{t('bawarStar.afnProduct', 'AFN Product')}</span>
            </div>
            <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 mt-0.5">
              +{(summary?.revenue_split?.total_pass_through || 0).toLocaleString()} {t('bawarStar.afnPassThrough', 'AFN Pass-Through')}
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-2 gap-2 text-[10.5px] font-medium">
            <div className="flex items-center space-x-1 text-slate-600 dark:text-slate-300 truncate">
              <Truck className="w-3 h-3 text-amber-500 shrink-0" />
              <span>{t('bawarStar.freight', 'Freight:')} <strong>{(summary?.revenue_split?.freight_billed || 0).toLocaleString()}</strong></span>
            </div>
            <div className="flex items-center space-x-1 text-slate-600 dark:text-slate-300 truncate">
              <Box className="w-3 h-3 text-purple-500 shrink-0" />
              <span>{t('bawarStar.pkg', 'Pkg:')} <strong>{(summary?.revenue_split?.packaging_billed || 0).toLocaleString()}</strong></span>
            </div>
          </div>
        </div>

        {/* CARD 3: PROFITABILITY & GROSS MARGIN */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-900/90 via-slate-900 to-slate-900 border border-emerald-500/30 p-4 shadow-xs text-white">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
              {t('bawarStar.manufacturingProfitability', 'Manufacturing Profitability')}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>

          <div className="mt-2">
            <div className="text-2xl font-black text-white tracking-tight">
              {(summary?.estimated_gross_profit || 0).toLocaleString()} <span className="text-xs font-semibold text-emerald-400/80">{t('bawarStar.afnProfit', 'AFN Profit')}</span>
            </div>
          </div>

          <div className="mt-3 pt-2.5 border-t border-emerald-500/20 flex items-center justify-between text-[11px] font-semibold">
            <span className="text-slate-300">{t('bawarStar.grossMargin', 'Gross Margin:')}</span>
            <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 font-bold">
              {summary?.profit_margin_percentage || 0}% {t('bawarStar.margin', 'Margin')}
            </span>
          </div>
        </div>
      </div>

      {/* INTERACTIVE LEDGER TABLE CARD */}
      <div className="flex-1 min-h-0 flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
        
        {/* Table Controls Header */}
        <div className="p-3 sm:p-4 border-b border-slate-200/80 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
              <span>{t('bawarStar.partnerTransactions', 'Partner Ledger Transactions')}</span>
              <span className="px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400">
                {filteredTransactions.length} {t('bawarStar.entries', 'entries')}
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {selectedPartner ? `${t('bawarStar.viewingHistoryFor', 'Viewing account history for')} ${selectedPartner.name}` : t('bawarStar.selectPartnerAccount', 'Select a partner account')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder={t('bawarStar.searchPlaceholder', 'Search description or Pashto...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 pl-9 pr-4 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 outline-none w-56"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-10 px-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="ALL">{t('bawarStar.allTypes', 'All Types')}</option>
              <option value="SELL_PRODUCT">{t('bawarStar.productSales', 'Product Sales')}</option>
              <option value="PASS_THROUGH_FREIGHT">{t('bawarStar.freightLogistics', 'Freight / Logistics')}</option>
              <option value="PASS_THROUGH_PKG">{t('bawarStar.packaging', 'Packaging')}</option>
              <option value="PAYMENT_RECEIVED">{t('bawarStar.paymentsReceived', 'Payments Received')}</option>
            </select>
          </div>
        </div>

        {/* Data Grid */}
        <div className="flex-1 min-h-0 overflow-auto relative">
          <table className="w-full text-left border-collapse min-w-[950px]">
            <thead>
              <tr className="sticky top-0 z-20 bg-slate-900 dark:bg-slate-950 text-slate-200 uppercase font-bold tracking-wider text-[10px] border-b border-slate-800">
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">{t('bawarStar.date', 'Date')}</th>
                <th className="py-2.5 px-3">{t('bawarStar.type', 'Type')}</th>
                <th className="py-2.5 px-3">{t('bawarStar.description', 'Description (Pashto / English)')}</th>
                <th className="py-3.5 px-4 text-right">{t('bawarStar.qty', 'Qty')}</th>
                <th className="py-3.5 px-4 text-right">{t('bawarStar.unitPrice', 'Unit Price')}</th>
                <th className="py-3.5 px-4 text-right">{t('bawarStar.billedAmount', 'Billed Amount')}</th>
                <th className="py-3.5 px-4 text-right">{t('bawarStar.paidAmount', 'Paid Amount')}</th>
                <th className="py-3.5 px-4 text-right">{t('bawarStar.runningBalance', 'Running Balance')}</th>
                <th className="py-3.5 px-4 text-center">{t('bawarStar.action', 'Action')}</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan="10" className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                    <span>{t('bawarStar.loadingRecords', 'Loading ledger records...')}</span>
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan="10" className="py-12 text-center text-slate-400">
                    {t('bawarStar.noTransactions', 'No transactions found for this account.')}
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx, idx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-slate-400 font-medium">
                      {idx + 1}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                      {tx.transaction_date}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getTypeBadge(tx.transaction_type)}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {tx.description_en || '-'}
                      </div>
                      {tx.description_ps && (
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 dir-rtl text-right mt-0.5">
                          {tx.description_ps}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-700 dark:text-slate-300">
                      {tx.quantity ? tx.quantity.toLocaleString() : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-700 dark:text-slate-300">
                      {tx.unit_price ? `${tx.unit_price.toLocaleString()} AFN` : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                      {tx.billed_amount > 0 ? `${tx.billed_amount.toLocaleString()} AFN` : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {tx.paid_amount > 0 ? `${tx.paid_amount.toLocaleString()} AFN` : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-extrabold text-blue-600 dark:text-blue-400">
                      {tx.running_balance.toLocaleString()} AFN
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleDeleteTransaction(tx.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                        title="Delete Entry"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* QUICK ADD MODAL */}
      <QuickAddBawarStarModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        accounts={accounts}
        selectedPartnerId={selectedPartnerId}
        partnerName={selectedPartner?.name}
        onTransactionCreated={handleCreateTransaction}
        onSave={handleCreateTransaction}
      />

    </div>
  );
}
