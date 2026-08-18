import React, { useState } from 'react';
import { useTenant } from '../context/CompanyContext';
import { api } from '../services/api';

export function TransactionModal({ isOpen, onClose, type = 'CREDIT', onSuccess }) {
  const { activeCompany } = useTenant();
  const defaultAccounts = activeCompany?.currency === 'USD'
    ? ['Export Account', 'Import Account', 'Demurrage Account', 'General Ledger']
    : ['Main Cashbook', 'Factory Account', 'Petty Cash', 'General Ledger'];

  const [account, setAccount] = useState(defaultAccounts[0] || '');
  const [amount, setAmount] = useState('');
  const [detail, setDetail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const isCredit = type === 'CREDIT';
      const numAmount = parseFloat(amount);
      
      if (isNaN(numAmount) || numAmount <= 0) {
        setErrorMsg('Please enter a valid positive amount.');
        setIsSubmitting(false);
        return;
      }
      
      const isUsd = activeCompany?.currency === 'USD';

      await api.createTransaction({
        account_name: account,
        detail: detail || 'Tenant transaction entry',
        transaction_type: isCredit ? 'cash_in' : 'cash_out',
        cash_in_afn: isCredit && !isUsd ? numAmount : 0,
        cash_out_afn: !isCredit && !isUsd ? numAmount : 0,
        usd_in: isCredit && isUsd ? numAmount : 0,
        usd_out: !isCredit && isUsd ? numAmount : 0,
        exchange_rate: 64.3,
        payment_method: 'cash',
        category: 'other',
        date: new Date().toISOString().slice(0, 10),
        company_id: activeCompany?.id || 'cashbook_bawar_prod'
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (error) {
      setErrorMsg(error.message || 'Transaction failed. Please try again.');
      console.error("Transaction failed:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-xl border border-slate-200 dark:border-slate-800">
        <h3 className="text-lg font-extrabold text-slate-900 dark:text-white mb-1">
          New {type === 'CREDIT' ? 'Cash In' : 'Cash Out'} — {activeCompany?.name}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Transaction will be saved in {activeCompany?.currency}
        </p>

        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50 rounded-xl text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Select Account
            </label>
            <select 
              value={account} 
              onChange={(e) => setAccount(e.target.value)}
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
              required
            >
              {defaultAccounts.map((acc) => (
                <option key={acc} value={acc}>{acc}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Amount ({activeCompany?.currency})
            </label>
            <input 
              type="number" 
              step="0.01"
              min="0.01"
              value={amount} 
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
              required 
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Detail / Note
            </label>
            <input 
              type="text" 
              value={detail} 
              onChange={(e) => setDetail(e.target.value)}
              placeholder="Enter transaction description..."
              className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:text-white"
              required 
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 rounded-lg"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={isSubmitting}
              className={`px-4 py-2 text-sm font-bold text-white rounded-lg shadow-sm ${type === 'CREDIT' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'}`}
            >
              {isSubmitting ? 'Saving...' : `Confirm ${type === 'CREDIT' ? 'Cash In' : 'Cash Out'}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default TransactionModal;
