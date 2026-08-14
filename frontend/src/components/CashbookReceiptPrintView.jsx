import React from 'react';
import { useCompany } from '../context/CompanyContext';

export default function CashbookReceiptPrintView(props) {
  const { currentCompany } = useCompany();
  const companyName = props.companyName || currentCompany?.name || 'BAWAR STAR PLASTIC INDUSTRY';
  const companyLogo = props.companyLogo || currentCompany?.logo || '';
  const voucherNo = props.voucherNo || 'TX-20260707-0008';
  const date = props.date || '1405/04/16 | Jul 7, 2026';
  const accountName = props.accountName || 'Kandahar Construction Company';
  const category = props.category || 'Engineering Services';
  const paymentMethod = props.paymentMethod || 'CASH';
  const reference = props.reference || 'REF-98402';
  const details = props.details || 'Standard cashbook voucher transaction record';
  const amountAfn = props.amountAfn ?? 19250.00;
  const amountUsd = props.amountUsd ?? 299.38;
  const exchangeRate = props.exchangeRate || 64.3;
  const isCashIn = props.isCashIn || false;
  const notes = props.notes || '';

  const initials = companyName
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

  const SingleReceipt = ({ copyType }) => (
    <div className="w-full bg-white border border-slate-900 rounded-lg p-3.5 shadow-sm flex flex-col justify-between text-slate-800 font-sans max-h-[124mm]">
      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-slate-900 pb-2 mb-2">
        <div className="flex items-center gap-2.5">
          {companyLogo ? (
            <img src={companyLogo} alt="Logo" className="h-8 max-w-[70px] object-contain rounded" />
          ) : (
            <div className="w-7 h-7 rounded bg-slate-900 text-white font-black text-[10px] flex items-center justify-center">
              {initials}
            </div>
          )}
          <div>
            <h1 className="text-xs font-black tracking-tight uppercase text-slate-900">{companyName}</h1>
            <p className="text-[8.5px] text-slate-500 font-medium">{contactInfo}</p>
          </div>
        </div>
        <div className="text-right flex flex-col items-end">
          <span className="px-2 py-0.5 bg-slate-100 text-slate-800 text-[7.5px] font-bold rounded uppercase tracking-wider mb-0.5 border border-slate-300">
            {copyType}
          </span>
          <h2 className="text-[11px] font-extrabold text-blue-900 tracking-tight">
            {isCashIn ? 'RECEIPT VOUCHER' : 'PAYMENT VOUCHER'}
          </h2>
          <div className="text-[8.5px] font-mono text-slate-600 space-x-2 mt-0.5">
            <span><strong>Voucher No:</strong> {voucherNo}</span>
            <span><strong>Date:</strong> {date}</span>
          </div>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-4 gap-2 text-[9.5px] mb-2 bg-slate-50 p-2 rounded border border-slate-300">
        <div className="col-span-2 sm:col-span-1">
          <span className="block text-[7.5px] uppercase tracking-wider font-extrabold text-slate-500">Account / Party</span>
          <span className="font-bold text-slate-900 truncate block">{accountName}</span>
        </div>
        <div>
          <span className="block text-[7.5px] uppercase tracking-wider font-extrabold text-slate-500">Category</span>
          <span className="font-bold text-blue-700 uppercase block">{category}</span>
        </div>
        <div>
          <span className="block text-[7.5px] uppercase tracking-wider font-extrabold text-slate-500">Payment Method</span>
          <span className="font-bold text-slate-900 uppercase block">{paymentMethod}</span>
        </div>
        <div>
          <span className="block text-[7.5px] uppercase tracking-wider font-extrabold text-slate-500">Ref / Doc No</span>
          <span className="font-mono font-bold text-slate-900 block">{reference || '-'}</span>
        </div>
      </div>

      {/* Description Box */}
      <div className="bg-white border border-slate-300 rounded p-2 mb-2 text-[9.5px]">
        <span className="block text-[7.5px] uppercase tracking-wider font-extrabold text-slate-500 mb-0.5">Details / Description</span>
        <span className="font-medium text-slate-800 leading-snug block">{details || 'Standard cashbook voucher transaction record'}</span>
      </div>

      {/* Financial Breakdown */}
      <div className="grid grid-cols-3 gap-2 bg-slate-900 text-white p-2.5 rounded-md mb-2 text-center">
        <div>
          <span className="block text-[7.5px] uppercase tracking-wider text-slate-300 font-extrabold">Amount AFN</span>
          <span className="text-[12px] font-mono font-black text-emerald-400">AFN {typeof amountAfn === 'number' ? amountAfn.toLocaleString() : amountAfn}</span>
        </div>
        <div className="border-l border-slate-700">
          <span className="block text-[7.5px] uppercase tracking-wider text-slate-300 font-extrabold">Amount USD</span>
          <span className="text-[12px] font-mono font-black text-blue-300">USD {typeof amountUsd === 'number' ? amountUsd.toLocaleString() : amountUsd}</span>
        </div>
        <div className="border-l border-slate-700">
          <span className="block text-[7.5px] uppercase tracking-wider text-slate-300 font-extrabold">Exchange Rate</span>
          <span className="text-[12px] font-mono font-bold text-slate-200">{exchangeRate}</span>
        </div>
      </div>

      {notes && (
        <div className="text-[8.5px] italic bg-amber-50 border border-amber-200 p-1.5 rounded mb-2 text-amber-900">
          <strong className="not-italic">Remarks / Note:</strong> {notes}
        </div>
      )}

      {/* Signatures */}
      <div className="grid grid-cols-3 gap-4 pt-2 mt-0.5 border-t border-dashed border-slate-300 text-center">
        <div className="border-t border-slate-400 pt-0.5">
          <span className="text-[7.5px] font-bold text-slate-600 uppercase tracking-wider">Prepared By</span>
        </div>
        <div className="border-t border-slate-400 pt-0.5">
          <span className="text-[7.5px] font-bold text-slate-600 uppercase tracking-wider">Receiver Signature</span>
        </div>
        <div className="border-t border-slate-400 pt-0.5">
          <span className="text-[7.5px] font-bold text-slate-600 uppercase tracking-wider">Authorized Signature</span>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          *, *:before, *:after {
            box-sizing: border-box !important;
            margin: 0;
            padding: 0;
          }
          body, html {
            width: 210mm !important;
            height: 100% !important;
            max-height: 297mm !important;
            overflow: hidden !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          nav, aside, header, footer, button, .print-hidden, .no-print {
            display: none !important;
          }
          .payment-voucher-print, .receipt-print-wrapper {
            width: 100% !important;
            max-width: 200mm !important;
            height: 265mm !important;
            max-height: 265mm !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
            margin: 0 auto !important;
            padding: 3mm 4mm !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            page-break-before: avoid !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            break-before: avoid !important;
            break-after: avoid !important;
            break-inside: avoid !important;
          }
          .voucher-card {
            height: 124mm !important;
            max-height: 124mm !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
          }
        }
      `}</style>

      {/* Main 2-Up Container locked to exactly one A4 page */}
      <div className="payment-voucher-print receipt-print-wrapper flex flex-col justify-between h-[265mm] max-h-[265mm] w-[200mm] max-w-[200mm] mx-auto bg-white p-2 overflow-hidden">
        <SingleReceipt copyType="OFFICE COPY" />
        
        {/* Cut line divider */}
        <div className="flex items-center my-0.5 text-slate-400 h-[5mm] max-h-[5mm] shrink-0">
          <div className="flex-1 border-t border-dashed border-slate-300"></div>
          <span className="px-3 text-[7px] font-bold tracking-widest uppercase text-slate-400">
            ✂ Cut along dotted line for customer copy
          </span>
          <div className="flex-1 border-t border-dashed border-slate-300"></div>
        </div>

        <SingleReceipt copyType="CUSTOMER COPY" />
      </div>
    </>
  );
}

