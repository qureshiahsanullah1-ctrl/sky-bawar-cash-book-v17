import BaseModal from './BaseModal';
import { currency } from '../utils/format';
import DateDisplay from './DateDisplay';
import { useTranslation } from 'react-i18next';
import { Printer, Scissors } from 'lucide-react';

import { useCompany } from '../context/CompanyContext';

function SingleVoucherCard({ transaction, companyName, companyLogo, dateDisplayFormat, copyLabel, t }) {
  const { currentCompany } = useCompany();
  const isCashIn = transaction.transaction_type === 'cash_in';
  const afnAmount = isCashIn ? transaction.cash_in_afn : transaction.cash_out_afn;
  const usdAmount = isCashIn ? transaction.usd_in : transaction.usd_out;

  const displayName = companyName || currentCompany?.name || 'BAWAR STAR PLASTIC INDUSTRY';
  const displayLogo = companyLogo || currentCompany?.logo || '';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'BS';

  const contactInfo = currentCompany?.id === 'sky-ariana'
    ? '+93 700 345 630 | INFO@SKYARIANA.COM'
    : currentCompany?.tagline
      ? `+93 700 345 630 | ${currentCompany.tagline.toUpperCase()}`
      : '+93 700 345 630 | INFO@BAWARSTAR.COM';

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-3.5 text-xs">
      {/* Voucher Header */}
      <div className="flex justify-between items-start border-b-2 border-slate-900 dark:border-slate-200 pb-3">
        <div className="flex items-center gap-3">
          {displayLogo ? (
            <img src={displayLogo} alt="Logo" className="h-9 max-w-[80px] object-contain rounded" />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-slate-900 dark:bg-slate-100 flex items-center justify-center text-white dark:text-slate-900 font-bold text-xs">
              {initials}
            </div>
          )}
          <div>
            <h2 className="text-base font-extrabold uppercase text-slate-900 dark:text-white tracking-tight">
              {displayName}
            </h2>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
              {contactInfo}
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="inline-block text-[9px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700 mb-1">
            {copyLabel}
          </span>
          <h3 className="text-sm font-extrabold uppercase text-blue-700 dark:text-blue-400 tracking-tight">
            {isCashIn ? t('Receipt Voucher') || 'RECEIPT VOUCHER' : t('Payment Voucher') || 'PAYMENT VOUCHER'}
          </h3>
          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Voucher No:</span> {transaction.transaction_no || String(transaction.id).slice(0, 8)}
          </div>
          <div className="text-[10px] text-slate-500 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-300">Date:</span> <DateDisplay value={transaction.date} format={dateDisplayFormat} />
          </div>
        </div>
      </div>

      {/* Grid Key-Values */}
      <div className="grid grid-cols-4 gap-2.5 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-lg border border-slate-200/80 dark:border-slate-700/80">
        <div className="col-span-2 sm:col-span-1">
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">Account / Party</span>
          <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block truncate">{transaction.account_name || 'General Account'}</span>
        </div>
        <div>
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">Category</span>
          <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase block">{String(transaction.category || 'General').replaceAll('_', ' ')}</span>
        </div>
        <div>
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">Payment Method</span>
          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase block">{transaction.payment_method || 'CASH'}</span>
        </div>
        <div>
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">Ref / Doc No</span>
          <span className="text-xs font-mono font-semibold text-slate-800 dark:text-slate-200 block">{transaction.reference || '-'}</span>
        </div>
      </div>

      {/* Description Box */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-3">
        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-0.5">Details / Description</span>
        <span className="text-xs font-medium text-slate-800 dark:text-slate-200 block">{transaction.detail || 'Standard cashbook voucher transaction record'}</span>
      </div>

      {/* Amount Highlight Box */}
      <div className="grid grid-cols-3 bg-slate-900 dark:bg-slate-950 text-white rounded-lg p-3">
        <div>
          <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block">Amount AFN</span>
          <span className="text-base font-extrabold font-mono text-emerald-400 block">{currency(afnAmount, 'AFN')}</span>
        </div>
        <div className="border-l border-slate-700 pl-3">
          <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block">Amount USD</span>
          <span className="text-base font-extrabold font-mono text-blue-400 block">{currency(usdAmount, 'USD')}</span>
        </div>
        <div className="border-l border-slate-700 pl-3">
          <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block">Exchange Rate</span>
          <span className="text-xs font-bold font-mono text-slate-200 block mt-1">{transaction.exchange_rate || '-'}</span>
        </div>
      </div>

      {transaction.note && (
        <div className="text-xs italic bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 p-2.5 rounded-lg text-amber-800 dark:text-amber-300">
          <span className="font-bold not-italic">Remarks / Note:</span> {transaction.note}
        </div>
      )}

      {/* Signatures */}
      <div className="grid grid-cols-3 gap-4 text-center pt-3 border-t border-dashed border-slate-200 dark:border-slate-800">
        <div className="space-y-1">
          <div className="border-t-2 border-slate-300 dark:border-slate-700 pt-1"></div>
          <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Prepared By</span>
        </div>
        <div className="space-y-1">
          <div className="border-t-2 border-slate-300 dark:border-slate-700 pt-1"></div>
          <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Receiver Signature</span>
        </div>
        <div className="space-y-1">
          <div className="border-t-2 border-slate-300 dark:border-slate-700 pt-1"></div>
          <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Authorized Signature</span>
        </div>
      </div>
    </div>
  );
}

export default function ReceiptModal({ transaction, companyName, dateDisplayFormat, onClose, onPrint }) {
  const { t } = useTranslation();

  return (
    <BaseModal
      isOpen={!!transaction}
      onClose={onClose}
      title={t('Receipt / Voucher Preview (2-Up A4 Page)') || 'Receipt / Voucher Preview (2-Up A4 Page)'}
      maxWidth="680px"
    >
      {transaction && (
        <div className="space-y-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 text-xs p-3 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2 font-medium">
              <Scissors className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>Prints 2 identical vouchers (Office Copy & Customer Copy) on a single A4 page.</span>
            </div>
            <button
              onClick={onPrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-sm transition-colors text-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              {t('Print A4 2-Up Voucher')}
            </button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto pr-1 space-y-4">
            <SingleVoucherCard
              transaction={transaction}
              companyName={companyName}
              dateDisplayFormat={dateDisplayFormat}
              copyLabel="OFFICE COPY"
              t={t}
            />

            <div className="relative flex py-1 items-center">
              <div className="flex-grow border-t-2 border-dashed border-slate-300 dark:border-slate-700"></div>
              <span className="flex-shrink mx-4 text-[9px] font-extrabold tracking-wider uppercase text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                ✂ Cut Along Dotted Line
              </span>
              <div className="flex-grow border-t-2 border-dashed border-slate-300 dark:border-slate-700"></div>
            </div>

            <SingleVoucherCard
              transaction={transaction}
              companyName={companyName}
              dateDisplayFormat={dateDisplayFormat}
              copyLabel="CUSTOMER COPY"
              t={t}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              onClick={onClose}
            >
              {t('Close')}
            </button>
            <button
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors"
              onClick={onPrint}
            >
              <Printer className="w-4 h-4" />
              {t('Print Receipt (2-Up A4)')}
            </button>
          </div>
        </div>
      )}
    </BaseModal>
  );
}
