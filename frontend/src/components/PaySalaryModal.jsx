import React, { useState, useEffect } from 'react';
import { X, DollarSign, Calendar, CreditCard, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { currency as formatCurrency, jalaliFullDateLabel, jalaliPeriodLabel } from '../utils/format';

export default function PaySalaryModal({
  isOpen,
  onClose,
  onSubmit,
  employee,
  outstandingBalance = 0,
  selectedCurrency = 'AFN',
  isLoading = false,
  error = ''
}) {
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState(selectedCurrency || 'AFN');
  const [payMonth, setPayMonth] = useState(new Date().getMonth() + 1);
  const [payYear, setPayYear] = useState(new Date().getFullYear());
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setAmount(String(outstandingBalance > 0 ? outstandingBalance : employee?.monthly_salary || ''));
      setCurrency(selectedCurrency || employee?.currency || 'AFN');
      setPayMonth(new Date().getMonth() + 1);
      setPayYear(new Date().getFullYear());
      setPaymentDate(new Date().toISOString().slice(0, 10));
      setPaymentMethod('cash');
      setNotes('');
      setFormError('');
    }
  }, [isOpen, outstandingBalance, employee, selectedCurrency]);

  if (!isOpen || !employee) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      setFormError('Please enter a valid positive payment amount.');
      return;
    }

    const padMonth = String(payMonth).padStart(2, '0');
    const periodStr = `${payYear}-${padMonth}`;

    setFormError('');
    onSubmit({
      employee_id: employee.id,
      amount: numAmount,
      currency,
      period: periodStr,
      payment_date: paymentDate,
      payment_method: paymentMethod,
      notes
    });
  };

  const monthOptions = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  const currentPeriodStr = `${payYear}-${String(payMonth).padStart(2, '0')}`;
  const jalaliPeriod = jalaliPeriodLabel(currentPeriodStr);

  return (
    <div 
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pay-salary-title"
    >
      <div className="bg-white dark:bg-slate-850 text-slate-900 dark:text-slate-100 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all border border-slate-200 dark:border-slate-700/80 my-4 sm:my-8">
        
        {/* Header Section */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/50">
          <div>
            <h3 id="pay-salary-title" className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              Process Salary Payment
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Record salary disbursement for <span className="font-semibold text-slate-700 dark:text-slate-300">{employee.full_name}</span> ({employee.employee_code || `EMP-${employee.id}`})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-3.5">
          {(error || formError) && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0 text-rose-500" />
              <span>{error || formError}</span>
            </div>
          )}

          {/* Balance Overview Banner */}
          <div className="p-3.5 bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-amber-50/80 dark:from-slate-900 dark:via-slate-900 dark:to-slate-900 rounded-xl border border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Outstanding Unpaid Balance
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Monthly: {formatCurrency(employee.monthly_salary || 0, currency)}
              </span>
            </div>
            <div className="text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400 tabular-nums">
              {formatCurrency(outstandingBalance, currency)}
            </div>
          </div>

          {/* Salary Period (Month & Year) with Persian Period Pill */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Calendar size={13} className="text-blue-500" /> Salary Period / دوره حقوق
              </label>
              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 font-mono bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded-full border border-indigo-200/50 dark:border-indigo-800/50">
                {jalaliPeriod}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <select
                  value={payMonth}
                  onChange={(e) => setPayMonth(Number(e.target.value))}
                  className="bg-slate-50 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs sm:text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 font-medium shadow-xs"
                >
                  {monthOptions.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <input
                  type="number"
                  value={payYear}
                  onChange={(e) => setPayYear(Number(e.target.value))}
                  className="bg-slate-50 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs sm:text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 font-medium shadow-xs"
                  required
                />
              </div>
            </div>
          </div>

          {/* Payment Date with Dual Jalali Date Display */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Disbursement Date / تاریخ پرداخت
              </label>
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono font-medium">
                {jalaliFullDateLabel(paymentDate)}
              </span>
            </div>
            <input
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="bg-slate-50 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs sm:text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 font-medium shadow-xs"
              required
            />
          </div>

          {/* Payment Amount & Currency Toggle & Presets */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Payment Amount
              </label>
              <div className="flex items-center gap-1.5">
                {outstandingBalance > 0 && (
                  <button
                    type="button"
                    onClick={() => setAmount(String(outstandingBalance))}
                    className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md border border-blue-200/60 dark:border-blue-800/60"
                  >
                    Full Due (100%)
                  </button>
                )}
                {employee.monthly_salary > 0 && (
                  <button
                    type="button"
                    onClick={() => setAmount(String(employee.monthly_salary))}
                    className="text-[10px] font-bold text-slate-600 dark:text-slate-300 hover:underline bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700"
                  >
                    1 Month
                  </button>
                )}
              </div>
            </div>
            <div className="relative flex rounded-xl shadow-xs">
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-slate-50 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-base font-bold font-mono rounded-l-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                required
              />
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="bg-slate-100 dark:bg-slate-800 border border-l-0 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-r-xl px-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shrink-0"
              >
                <option value="AFN">AFN</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>


          {/* Payment Method */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <CreditCard size={13} className="text-emerald-500" /> Payment Method
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="bg-slate-50 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 font-medium shadow-xs"
            >
              <option value="cash">Cash Payment</option>
              <option value="bank">Bank Transfer</option>
              <option value="hawala">Hawala / Money Exchange</option>
              <option value="other">Other Method</option>
            </select>
          </div>

          {/* Notes / Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
              <FileText size={13} className="text-slate-400" /> Description / Note (Optional)
            </label>
            <textarea
              rows="2"
              placeholder="e.g. Salary payment for active period..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-slate-50 dark:bg-slate-900/60 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-sm rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 shadow-xs font-normal"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-700/80 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium rounded-xl px-4 py-2 text-sm shadow-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="text-white bg-blue-600 hover:bg-blue-700 font-semibold rounded-xl px-5 py-2 text-sm flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Confirm Payment</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
