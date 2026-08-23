// cspell:ignore tabular nums
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft,
  BookOpenText,
  Calendar,
  DollarSign,
  Download,
  FileSpreadsheet,
  PlusCircle,
  Printer,
  X,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  UserCheck,
  Building2,
  Briefcase,
  Search,
  RefreshCw,
  Filter
} from 'lucide-react';
import { api } from '../services/api';
import { currency as formatCurrency, dateLabel, jalaliDateLabel, jalaliFullDateLabel, jalaliPeriodLabel, dualDateLabel, csvCell, resolveAvatarUrl } from '../utils/format';
import GoogleIcon from '../components/GoogleIcon';
import BaseModal from '../components/BaseModal';
import PaySalaryModal from '../components/PaySalaryModal';

import { generateEmployeeLedgerPrintHtml } from '../utils/employeePrint';

function decodeHtmlEntities(str) {
  if (!str) return '';
  let text = String(str);
  while (text.includes('&amp;')) {
    text = text.replace(/&amp;/g, '&');
  }
  return text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

export default function EmployeeLedgerPage({ currentUser, companyName = 'Cashbook Of All companies', companyLogo = '' }) {
  const { t } = useTranslation();
  const { employeeId } = useParams();
  const navigate = useNavigate();

  const [employee, setEmployee] = useState(null);
  const [ledgerData, setLedgerData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [periodFilter, setPeriodFilter] = useState('');
  const [entryTypeFilter, setEntryTypeFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('oldest'); 
  const [selectedCurrency, setSelectedCurrency] = useState('AFN');
  const [page, setPage] = useState(1);
  const pageSize = 100;

  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [adjForm, setAdjForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    period: new Date().toISOString().slice(0, 7),
    amount: '',
    currency: 'AFN',
    adjustment_type: 'bonus',
    reason: '',
    notes: ''
  });
  const [adjSaving, setAdjSaving] = useState(false);
  const [adjError, setAdjError] = useState('');

  const [showSetJoiningDate, setShowSetJoiningDate] = useState(false);
  const [joiningDateInput, setJoiningDateInput] = useState('');
  const [joiningDateSaving, setJoiningDateSaving] = useState(false);
  const [joiningDateError, setJoiningDateError] = useState('');

  const [showPayModal, setShowPayModal] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMonth, setPayMonth] = useState(new Date().getMonth() + 1);
  const [payYear, setPayYear] = useState(new Date().getFullYear());
  const [payMethod, setPayMethod] = useState('cash');
  const [payNotes, setPayNotes] = useState('');
  const [paySaving, setPaySaving] = useState(false);
  const [payError, setPayError] = useState('');

  useEffect(() => {
    if (employeeId) {
      loadEmployeeAndLedger();
    }
  }, [employeeId, fromDate, toDate, selectedCurrency, page]);

  async function loadEmployeeAndLedger() {
    setLoading(true);
    setError('');
    try {
      const [empList, ledger] = await Promise.all([
        api.getEmployees(),
        api.getEmployeeSalaryLedger(employeeId, {
          from_date: fromDate || undefined,
          to_date: toDate || undefined,
          currency: selectedCurrency || undefined,
          page,
          page_size: pageSize
        })
      ]);
      const currentEmp = empList.find((e) => String(e.id) === String(employeeId));
      if (!currentEmp && !ledger.employee) {
        throw new Error('Employee not found');
      }
      setEmployee(currentEmp || ledger.employee);
      setLedgerData(ledger);
    } catch (err) {
      console.error('Failed to load employee ledger:', err);
      setError(err.message || 'Failed to load employee ledger data.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddAdjustment(e) {
    e.preventDefault();
    setAdjSaving(true);
    setAdjError('');
    try {
      await api.addEmployeeSalaryAdjustment(employeeId, {
        date: adjForm.date,
        period: adjForm.period,
        amount: parseFloat(adjForm.amount),
        currency: adjForm.currency,
        adjustment_type: adjForm.adjustment_type,
        reason: adjForm.reason,
        notes: adjForm.notes
      });
      setShowAdjustmentModal(false);
      setAdjForm({
        date: new Date().toISOString().slice(0, 10),
        period: new Date().toISOString().slice(0, 7),
        amount: '',
        currency: 'AFN',
        adjustment_type: 'bonus',
        reason: '',
        notes: ''
      });
      await loadEmployeeAndLedger();
    } catch (err) {
      console.error('Failed to add adjustment:', err);
      setAdjError(err.message || 'Failed to save salary adjustment.');
    } finally {
      setAdjSaving(false);
    }
  }

  async function handleSaveJoiningDate(e) {
    e.preventDefault();
    if (!joiningDateInput) return;
    setJoiningDateSaving(true);
    setJoiningDateError('');
    try {
      await api.updateEmployee(employeeId, { joining_date: joiningDateInput });
      setShowSetJoiningDate(false);
      await loadEmployeeAndLedger();
    } catch (err) {
      console.error('Failed to update joining date:', err);
      setJoiningDateError(err.message || 'Failed to update joining date');
    } finally {
      setJoiningDateSaving(false);
    }
  }

  async function handlePaySalary(e) {
    e.preventDefault();
    if (!payAmount || parseFloat(payAmount) <= 0) {
      setPayError('Please enter a valid payment amount.');
      return;
    }
    setPaySaving(true);
    setPayError('');
    try {
      const padMonth = String(payMonth).padStart(2, '0');
      const periodStr = `${payYear}-${padMonth}`;
      await api.recordEmployeeSalaryPayment(employeeId, {
        period: periodStr,
        amount: parseFloat(payAmount),
        payment_method: payMethod,
        notes: payNotes,
        currency: selectedCurrency
      });
      setShowPayModal(false);
      setPayAmount('');
      setPayNotes('');
      await loadEmployeeAndLedger();
    } catch (err) {
      console.error('Failed to record salary payment:', err);
      setPayError(err.message || 'Failed to record salary payment.');
    } finally {
      setPaySaving(false);
    }
  }

  const [deletingId, setDeletingId] = useState(null);

  async function handleDeleteEntry(entry) {
    if (!window.confirm(`Are you sure you want to delete this ${entry.entry_type.replace('_', ' ')} (${entry.reference || entry.description})? This will also remove any linked cash transactions.`)) {
      return;
    }
    setDeletingId(entry.id);
    try {
      if (entry.entry_type === 'salary_payment') {
        const paymentId = parseInt(entry.id.replace('payment-', ''));
        await api.deleteSalaryPayment(paymentId);
      } else if (['bonus', 'deduction', 'adjustment', 'advance', 'reversal'].includes(entry.entry_type)) {
        const adjId = parseInt(entry.id.replace('adjustment-', ''));
        await api.deleteEmployeeSalaryAdjustment(employeeId, adjId);
      }
      await loadEmployeeAndLedger();
    } catch (err) {
      setError(err.message || 'Failed to delete ledger entry');
    } finally {
      setDeletingId(null);
    }
  }


  const getBadgeStyle = (entryType) => {
    switch (entryType) {
      case 'salary_accrual':
        return 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'salary_payment':
        return 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'bonus':
        return 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800';
      case 'deduction':
        return 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      case 'advance':
        return 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800';
      case 'adjustment':
        return 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      default:
        return 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  const getBadgeIcon = (entryType) => {
    switch (entryType) {
      case 'salary_accrual':
        return 'event_available';
      case 'salary_payment':
        return 'payments';
      case 'bonus':
        return 'trending_up';
      case 'deduction':
        return 'trending_down';
      case 'advance':
        return 'receipt_long';
      case 'adjustment':
        return 'tune';
      case 'reversal':
        return 'history';
      default:
        return 'description';
    }
  };

  const displayedEntries = useMemo(() => {
    if (!ledgerData?.entries) return [];
    let list = [...ledgerData.entries];
    if (periodFilter) {
      list = list.filter((e) => e.period && e.period.includes(periodFilter));
    }
    if (entryTypeFilter !== 'all') {
      list = list.filter((e) => e.entry_type === entryTypeFilter);
    }
    if (sortOrder === 'newest') {
      list.sort((a, b) => new Date(b.date) - new Date(a.date));
    } else {
      list.sort((a, b) => new Date(a.date) - new Date(b.date));
    }
    return list;
  }, [ledgerData?.entries, periodFilter, entryTypeFilter, sortOrder]);

  const totals = useMemo(() => {
    let accrued = 0;
    let payment = 0;
    let bonus = 0;
    let deduction = 0;
    let adjustment = 0;

    for (const e of displayedEntries) {
      accrued += Number(e.salary_accrued || e.debit || 0);
      payment += Number(e.payment || e.credit || 0);
      bonus += Number(e.bonus || 0);
      deduction += Number(e.deduction || 0);
      adjustment += Number(e.adjustment || 0);
    }
    return { accrued, payment, bonus, deduction, adjustment };
  }, [displayedEntries]);

  function exportCsv() {
    if (!displayedEntries.length) return;
    const headers = ['Date', 'Payroll Period', 'Entry Type', 'Description', 'Salary Accrued', 'Payment', 'Bonus', 'Deduction', 'Adjustment', 'Running Balance', 'Currency', 'Reference'];
    const rows = displayedEntries.map((entry) => [
      csvCell(entry.date),
      csvCell(entry.period),
      csvCell(entry.entry_type),
      csvCell(entry.description),
      csvCell(entry.salary_accrued || entry.debit || 0),
      csvCell(entry.payment || entry.credit || 0),
      csvCell(entry.bonus || 0),
      csvCell(entry.deduction || 0),
      csvCell(entry.adjustment || 0),
      csvCell(entry.running_balance || 0),
      csvCell(entry.currency),
      csvCell(entry.reference || '')
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${employee?.full_name || 'Employee'}_Salary_Ledger.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handlePrint() {
    if (!ledgerData || !employee) return;
    const printWin = window.open('', '_blank');
    if (!printWin) return;
    const html = generateEmployeeLedgerPrintHtml({
      employee,
      ledgerData,
      entries: displayedEntries,
      companyName,
      companyLogo,
      currencyCode: selectedCurrency
    });
    printWin.document.write(html);
    printWin.document.close();
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 flex flex-col items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mb-3" />
        <p className="text-sm font-medium">{t('employeeLedger.loading') || 'Loading Employee Salary Ledger...'}</p>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="p-8 max-w-xl mx-auto">
        <div className="p-6 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
          <h2 className="text-lg font-bold text-rose-200">{t('employeeLedger.errorLoading') || 'Error Loading Ledger'}</h2>
          <p className="text-xs text-rose-300">{error || 'Employee details could not be found.'}</p>
          <button
            onClick={() => navigate('/salary')}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs rounded-xl border border-slate-700"
          >
            {t('employeeLedger.backToList') || 'Back to Employees List'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-none px-3 sm:px-4 lg:px-5 pb-8 space-y-4 text-slate-900 dark:text-slate-100" style={{ zoom: 0.90 }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <button
          onClick={() => navigate('/salary')}
          className="self-start flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-800 shadow-sm transition-all"
        >
          <ArrowLeft className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>Back to Employees</span>
        </button>
        <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
          {t('employeeLedger.workspaceTitle') || 'Employee Salary Ledger Workspace'}
        </span>
      </div>

      {/* Employee Profile Header */}
      <div className="w-full flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm">
        <div className="flex items-start sm:items-center gap-4 flex-1 min-w-0">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-black text-xl text-white shadow-md overflow-hidden shrink-0 ring-2 ring-indigo-500/20">
            {(employee.avatar_url || employee.photo) ? (
              <img 
                src={resolveAvatarUrl(employee.avatar_url || employee.photo)} 
                alt={employee.full_name} 
                className="w-full h-full object-cover" 
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            ) : (
              employee.full_name.slice(0, 2).toUpperCase()
            )}
          </div>
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight break-words">{employee.full_name}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                {employee.employee_code || `EMP-${employee.id}`}
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                employee.status === 'active' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}>
                {employee.status || 'active'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5 text-blue-500" /> {employee.position || 'Position not set'}</span>
              <span>&bull;</span>
              <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-indigo-500" /> {decodeHtmlEntities(employee.department) || 'General'}</span>
              <span>&bull;</span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-500" />
                {employee.joining_date ? `Joined: ${dateLabel(employee.joining_date)}` : 'Joining Date Not Set'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
          <button
            onClick={() => {
              setPayAmount(String(ledgerData?.summary?.outstanding_balance || employee.monthly_salary || ''));
              setShowPayModal(true);
            }}
            className="flex-1 md:flex-initial px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-extrabold rounded-xl shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-1.5 active:scale-95"
          >
            <DollarSign className="w-4 h-4" /> Pay Salary
          </button>
          <button
            onClick={() => setShowAdjustmentModal(true)}
            className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-extrabold rounded-xl border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1.5 active:scale-95"
          >
            <PlusCircle className="w-4 h-4 text-emerald-500" /> Add Adjustment
          </button>
          <button
            onClick={handlePrint}
            disabled={loading || !ledgerData}
            className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-700 transition-all disabled:opacity-50"
            title="Print Ledger"
          >
            <Printer className="w-4 h-4" />
          </button>
          <button
            onClick={exportCsv}
            disabled={loading || !ledgerData}
            className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-700 transition-all disabled:opacity-50"
            title="Export CSV"
          >
            <FileSpreadsheet className="w-4 h-4" />
          </button>
        </div>
      </div>

      {ledgerData && !ledgerData.policy.carry_forward_enabled && (
        <div className="w-full p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-amber-800 dark:text-amber-200 shadow-xs">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            <div>
              <p className="font-bold text-sm">{t('employeeLedger.joiningDateNotSet') || 'Joining date not set — historical salary carry forward is disabled.'}</p>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">{t('employeeLedger.joiningDateNotice') || "Only the current month's salary remaining is displayed. Historical unpaid balances are omitted until a Joining Date is assigned."}</p>
            </div>
          </div>
          {!showSetJoiningDate ? (
            <button
              onClick={() => {
                setJoiningDateInput(new Date().toISOString().slice(0, 10));
                setShowSetJoiningDate(true);
                setJoiningDateError('');
              }}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all whitespace-nowrap"
            >
              {t('employeeLedger.setJoiningDate') || 'Set Joining Date'}
            </button>
          ) : (
            <div className="flex flex-col gap-2 w-full sm:w-auto">
              {joiningDateError && (
                <div className="text-rose-500 font-bold text-xs">{joiningDateError}</div>
              )}
              <form onSubmit={handleSaveJoiningDate} className="flex items-center gap-2">
                <input
                  type="date"
                  value={joiningDateInput}
                  onChange={(e) => setJoiningDateInput(e.target.value)}
                  className="px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 rounded-xl text-slate-900 dark:text-white focus:outline-none"
                  required
                />
                <button
                  type="submit"
                  disabled={joiningDateSaving}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition-all"
                >
                  {t('employeeLedger.save') || 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSetJoiningDate(false)}
                  className="px-2 py-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-white"
                >
                  {t('employeeLedger.cancel') || 'Cancel'}
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Summary Cards: Spans 100% full width across 4 responsive columns (2 cols on mobile) */}
      {ledgerData && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5 w-full">
          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-xs relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('employeeLedger.totalSalaryAccrued') || 'Total Salary Accrued'}</div>
              <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5 tabular-nums tracking-tight font-mono">
                {formatCurrency(ledgerData.summary.total_accrued || 0, selectedCurrency)}
              </div>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1 font-medium">
              <TrendingUp className="w-3 h-3 text-blue-500" />
              <span>{t('employeeLedger.since') || 'Since '}{employee.joining_date ? dateLabel(employee.joining_date) : (t('payroll.currentMonth') || 'current month')}</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-xs relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('employeeLedger.totalPaid') || 'Total Paid'}</div>
              <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5 tabular-nums tracking-tight font-mono">
                {formatCurrency(ledgerData.summary.total_paid || 0, selectedCurrency)}
              </div>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1 font-medium">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              <span>{t('employeeLedger.totalDisbursements') || 'Total disbursements'}</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-xs relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('employeeLedger.outstandingBalance') || 'Outstanding Balance'}</div>
              <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5 tabular-nums tracking-tight font-mono">
                {formatCurrency(ledgerData.summary.outstanding_balance || 0, selectedCurrency)}
              </div>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1 font-medium">
              <BookOpenText className="w-3 h-3 text-amber-500" />
              <span>{t('employeeLedger.runningUnpaidBalance') || 'Running unpaid balance'}</span>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-xs relative overflow-hidden flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t('employeeLedger.currentMonthRemaining') || 'Current Month Remaining'}</div>
              <div className="text-xl font-black text-blue-600 dark:text-blue-400 mt-0.5 tabular-nums tracking-tight font-mono">
                {formatCurrency(ledgerData.summary.current_month_remaining || 0, selectedCurrency)}
              </div>
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1 font-medium">
              <Calendar className="w-3 h-3 text-blue-500" />
              <span>{t('employeeLedger.activePeriodBalance') || 'Active period balance'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Filter Bar: Spans 100% full width */}
      <div className="w-full bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/90 dark:border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 text-blue-500" /> Filters:
          </div>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs rounded-lg focus:ring-2 focus:ring-blue-500 outline-none block font-medium"
            title="From Date"
          />
          <span className="text-[11px] font-bold text-slate-400">to</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs rounded-lg focus:ring-2 focus:ring-blue-500 outline-none block font-medium"
            title="To Date"
          />

          <select
            value={entryTypeFilter}
            onChange={(e) => setEntryTypeFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs rounded-lg focus:ring-2 focus:ring-blue-500 outline-none block font-bold"
          >
            <option value="all">{t('employeeLedger.allEntryTypes') || 'All Entry Types'}</option>
            <option value="salary_accrual">{t('employeeLedger.salaryAccrual') || 'Salary Accrual'}</option>
            <option value="salary_payment">{t('employeeLedger.salaryPayment') || 'Salary Payment'}</option>
            <option value="bonus">{t('employeeLedger.bonus') || 'Bonus'}</option>
            <option value="deduction">{t('employeeLedger.deduction') || 'Deduction'}</option>
            <option value="advance">{t('employeeLedger.advance') || 'Advance'}</option>
            <option value="adjustment">{t('employeeLedger.adjustment') || 'Adjustment'}</option>
            <option value="reversal">{t('employeeLedger.reversal') || 'Reversal'}</option>
          </select>

          <input
            type="text"
            placeholder="Period (e.g. 2026-07)"
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs rounded-xl focus:ring-2 focus:ring-blue-500 outline-none block w-36 font-medium"
          />
        </div>

        <div className="flex items-center gap-3 justify-between md:justify-end">
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs rounded-xl focus:ring-2 focus:ring-blue-500 outline-none block font-bold"
          >
            <option value="oldest">{t('employeeLedger.sortOldest') || 'Sort: Oldest First'}</option>
            <option value="newest">{t('employeeLedger.sortNewest') || 'Sort: Newest First'}</option>
          </select>

          <button
            onClick={() => {
              setFromDate('');
              setToDate('');
              setPeriodFilter('');
              setEntryTypeFilter('all');
              setSortOrder('oldest');
            }}
            className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            {t('employeeLedger.reset') || 'Reset'}
          </button>
        </div>
      </div>

      {/* Main Ledger Table: Full Width Container with Responsive Columns and No Truncated Headers */}
      <div className="w-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800/90 backdrop-blur-xs border-b border-slate-200 dark:border-slate-700 text-[11px] font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-200">
                <th className="py-2.5 px-3 whitespace-nowrap min-w-[125px]">
                  <div className="flex items-center gap-1">
                    <GoogleIcon name="calendar_month" size={13} className="text-blue-500" />
                    <span>{t('employeeLedger.date') || 'Date / تاریخ'}</span>
                  </div>
                </th>
                <th className="py-2.5 px-2.5 whitespace-nowrap min-w-[95px]">{t('employeeLedger.period') || 'Period / دوره'}</th>
                <th className="py-2.5 px-2.5 whitespace-nowrap min-w-[125px]">{t('employeeLedger.entryType') || 'Entry Type / نوعیت'}</th>
                <th className="py-2.5 px-3 min-w-[180px]">{t('employeeLedger.description') || 'Description / تفصیل'}</th>
                <th className="py-2.5 px-2.5 text-right whitespace-nowrap min-w-[100px]">{t('employeeLedger.accrued') || 'Accrued'}</th>
                <th className="py-2.5 px-2.5 text-right whitespace-nowrap min-w-[100px]">{t('employeeLedger.payment') || 'Payment'}</th>
                <th className="py-2.5 px-2 text-right whitespace-nowrap min-w-[80px]">{t('employeeLedger.bonus') || 'Bonus'}</th>
                <th className="py-2.5 px-2 text-right whitespace-nowrap min-w-[90px]">{t('employeeLedger.deduction') || 'Deduction'}</th>
                <th className="py-2.5 px-2 text-right whitespace-nowrap min-w-[95px]">{t('employeeLedger.adjustment') || 'Adjustment'}</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap min-w-[115px]">{t('employeeLedger.balance') || 'Balance / باقیمانده'}</th>
                <th className="py-2.5 px-2.5 text-center whitespace-nowrap min-w-[70px]">{t('employeeLedger.reference') || 'Ref'}</th>
                <th className="py-2.5 px-2.5 text-center whitespace-nowrap min-w-[60px]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
              {displayedEntries.length === 0 ? (
                <tr>
                  <td colSpan="12" className="py-12 text-center text-slate-500 font-medium">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <GoogleIcon name="folder_off" size={32} className="text-slate-400" />
                      <span>{t('employeeLedger.noEntriesFound') || 'No ledger entries found matching your filters.'}</span>
                    </div>
                  </td>
                </tr>
              ) : (
                displayedEntries.map((entry) => (
                  <tr key={entry.id} className="even:bg-slate-50/40 dark:even:bg-slate-900/40 hover:bg-blue-50/40 dark:hover:bg-slate-800/60 transition-colors border-b border-slate-200/50 dark:border-slate-800/50">
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{dateLabel(entry.date)}</div>
                      <div className="text-[10.5px] font-mono text-indigo-600 dark:text-indigo-400 font-semibold mt-0.5 flex items-center gap-1">
                        <span>{jalaliDateLabel(entry.date)}</span>
                        <span className="text-slate-400 font-normal">({jalaliFullDateLabel(entry.date).split(' ')[1] || ''})</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-2.5 whitespace-nowrap">
                      <div className="text-slate-800 dark:text-slate-200 font-mono font-bold text-xs">{entry.period}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                        {jalaliPeriodLabel(entry.period)}
                      </div>
                    </td>
                    <td className="py-2.5 px-2.5 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold uppercase border inline-flex items-center gap-1.5 whitespace-nowrap shadow-2xs ${getBadgeStyle(entry.entry_type)}`}>
                        <GoogleIcon name={getBadgeIcon(entry.entry_type)} size={13} filled />
                        <span>{entry.entry_type.replace('_', ' ')}</span>
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-800 dark:text-slate-200 font-medium max-w-xl">
                      <span className="block truncate" title={entry.description}>
                        {entry.description}
                      </span>
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-mono font-extrabold text-blue-600 dark:text-blue-400 whitespace-nowrap tabular-nums">
                      {(entry.salary_accrued || entry.debit) ? formatCurrency(entry.salary_accrued || entry.debit, entry.currency) : '-'}
                    </td>
                    <td className="py-2.5 px-2.5 text-right font-mono font-extrabold text-emerald-600 dark:text-emerald-400 whitespace-nowrap tabular-nums">
                      {(entry.payment || entry.credit) ? formatCurrency(entry.payment || entry.credit, entry.currency) : '-'}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono font-bold text-teal-600 dark:text-teal-400 whitespace-nowrap tabular-nums">
                      {entry.bonus ? formatCurrency(entry.bonus, entry.currency) : '-'}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono font-bold text-rose-600 dark:text-rose-400 whitespace-nowrap tabular-nums">
                      {entry.deduction ? formatCurrency(entry.deduction, entry.currency) : '-'}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap tabular-nums">
                      {entry.adjustment ? (entry.adjustment > 0 ? `+${formatCurrency(entry.adjustment, entry.currency)}` : formatCurrency(entry.adjustment, entry.currency)) : '-'}
                    </td>
                    <td className={`py-2.5 px-3 text-right font-mono font-black whitespace-nowrap tabular-nums ${
                      entry.running_balance < 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'
                    }`}>
                      {formatCurrency(entry.running_balance, entry.currency)}
                    </td>
                    <td className="py-2.5 px-2.5 text-center text-[10px] text-slate-500 dark:text-slate-400 font-mono font-semibold whitespace-nowrap">
                      {entry.reference || '-'}
                    </td>
                    <td className="py-2.5 px-2.5 text-center whitespace-nowrap">
                      {['salary_payment', 'bonus', 'deduction', 'adjustment', 'advance', 'reversal'].includes(entry.entry_type) ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteEntry(entry)}
                          disabled={deletingId === entry.id}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-all cursor-pointer disabled:opacity-50"
                          title="Delete / Void Entry"
                        >
                          <GoogleIcon name="delete" size={15} />
                        </button>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {displayedEntries.length > 0 && (
              <tfoot className="bg-slate-100 dark:bg-slate-800/90 border-t-2 border-slate-300 dark:border-slate-700 font-bold text-xs">
                <tr>
                  <td colSpan="4" className="py-3 px-3 text-slate-800 dark:text-slate-200 uppercase tracking-wider font-extrabold text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <GoogleIcon name="analytics" size={15} className="text-indigo-500" />
                      <span>{t('employeeLedger.totalSummary') || 'Total Summary'} ({displayedEntries.length} entries)</span>
                    </div>
                  </td>
                  <td className="py-3 px-2.5 text-right font-mono font-black text-blue-600 dark:text-blue-400 tabular-nums">
                    {totals.accrued > 0 ? formatCurrency(totals.accrued, selectedCurrency) : '-'}
                  </td>
                  <td className="py-3 px-2.5 text-right font-mono font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {totals.payment > 0 ? formatCurrency(totals.payment, selectedCurrency) : '-'}
                  </td>
                  <td className="py-3 px-2 text-right font-mono font-black text-teal-600 dark:text-teal-400 tabular-nums">
                    {totals.bonus > 0 ? `+${formatCurrency(totals.bonus, selectedCurrency)}` : '-'}
                  </td>
                  <td className="py-3 px-2 text-right font-mono font-black text-rose-600 dark:text-rose-400 tabular-nums">
                    {totals.deduction > 0 ? formatCurrency(totals.deduction, selectedCurrency) : '-'}
                  </td>
                  <td className="py-3 px-2 text-right font-mono font-black text-amber-600 dark:text-amber-400 tabular-nums">
                    {totals.adjustment !== 0 ? (totals.adjustment > 0 ? `+${formatCurrency(totals.adjustment, selectedCurrency)}` : formatCurrency(totals.adjustment, selectedCurrency)) : '-'}
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-black text-slate-900 dark:text-white tabular-nums text-sm">
                    {formatCurrency(ledgerData.summary.outstanding_balance || 0, selectedCurrency)}
                  </td>
                  <td colSpan="2" className="py-3 px-2.5 text-center text-[10px] text-slate-400 font-mono">
                    <GoogleIcon name="check_circle" size={14} className="text-emerald-500 inline" />
                  </td>
                </tr>
              </tfoot>
            )}

          </table>
        </div>

        {/* Mobile View Card List */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {displayedEntries.length === 0 ? (
            <div className="py-10 text-center text-slate-500 text-xs">
              {t('employeeLedger.noEntriesFound') || 'No ledger entries found matching your filters.'}
            </div>
          ) : (
            displayedEntries.map((entry) => (
              <div key={entry.id} className="p-4 space-y-2.5 bg-white dark:bg-slate-900">
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold text-slate-900 dark:text-slate-100">{dateLabel(entry.date)}</span>
                    <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-semibold ml-2">
                      ({jalaliDateLabel(entry.date)})
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase border inline-flex items-center gap-1 ${getBadgeStyle(entry.entry_type)}`}>
                    <GoogleIcon name={getBadgeIcon(entry.entry_type)} size={12} filled />
                    <span>{entry.entry_type.replace('_', ' ')}</span>
                  </span>
                </div>
                <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{entry.description}</div>
                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-slate-500 dark:text-slate-400">{t('employeeLedger.periodPrefix') || 'Period: '}</span>
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300">{entry.period}</span>
                    <span className="text-[10px] text-slate-400 block">{jalaliPeriodLabel(entry.period)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-500 dark:text-slate-400">{t('employeeLedger.balancePrefix') || 'Balance: '}</span>
                    <span className={`font-mono font-black text-sm block ${entry.running_balance < 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`}>
                      {formatCurrency(entry.running_balance, entry.currency)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs font-mono text-slate-700 dark:text-slate-300 pt-1">
                  {(entry.salary_accrued || entry.debit) > 0 && <span className="text-blue-600 dark:text-blue-400 font-bold">{t('employeeLedger.accruedPrefix') || 'Accrued: +'}{formatCurrency(entry.salary_accrued || entry.debit, entry.currency)}</span>}
                  {(entry.payment || entry.credit) > 0 && <span className="text-emerald-600 dark:text-emerald-400 font-bold">{t('employeeLedger.paidPrefix') || 'Paid: -'}{formatCurrency(entry.payment || entry.credit, entry.currency)}</span>}
                  {entry.bonus > 0 && <span className="text-teal-600 dark:text-teal-400 font-bold">{t('employeeLedger.bonusPrefix') || 'Bonus: +'}{formatCurrency(entry.bonus, entry.currency)}</span>}
                  {entry.deduction > 0 && <span className="text-rose-600 dark:text-rose-400 font-bold">{t('employeeLedger.deductionPrefix') || 'Deduction: -'}{formatCurrency(entry.deduction, entry.currency)}</span>}
                </div>
                {['salary_payment', 'bonus', 'deduction', 'adjustment', 'advance', 'reversal'].includes(entry.entry_type) && (
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => handleDeleteEntry(entry)}
                      disabled={deletingId === entry.id}
                      className="px-2.5 py-1 text-[11px] font-bold text-rose-500 hover:bg-rose-500/10 rounded-lg flex items-center gap-1 border border-rose-200 dark:border-rose-900/50"
                    >
                      <GoogleIcon name="delete" size={13} />
                      <span>Delete Entry</span>
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>


      {showAdjustmentModal && (
        <BaseModal
          isOpen={showAdjustmentModal}
          onClose={() => setShowAdjustmentModal(false)}
          title={`Add Salary Adjustment - ${employee.full_name}`}
        >
          <form onSubmit={handleAddAdjustment} className="space-y-4 text-slate-100">
            {adjError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs">
                {adjError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">{t('employeeLedger.adjustmentType') || 'Adjustment Type'}</label>
              <select
                value={adjForm.adjustment_type}
                onChange={(e) => setAdjForm({ ...adjForm, adjustment_type: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="bonus">{t('employeeLedger.bonusOption') || 'Bonus (+ Increases Balance)'}</option>
                <option value="deduction">{t('employeeLedger.deductionOption') || 'Deduction (- Reduces Balance)'}</option>
                <option value="advance">{t('employeeLedger.advanceOption') || 'Advance (- Salary Advance Taken)'}</option>
                <option value="adjustment">{t('employeeLedger.positiveAdjustmentOption') || 'Positive Adjustment (+ Credit)'}</option>
                <option value="reversal">{t('employeeLedger.reversalOption') || 'Reversal / Correction'}</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">{t('employeeLedger.date') || 'Date'}</label>
                <input
                  type="date"
                  value={adjForm.date}
                  onChange={(e) => setAdjForm({ ...adjForm, date: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">{t('employeeLedger.payrollPeriod') || 'Payroll Period'}</label>
                <input
                  type="month"
                  value={adjForm.period}
                  onChange={(e) => setAdjForm({ ...adjForm, period: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">{t('employeeLedger.amount') || 'Amount'}</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={adjForm.amount}
                  onChange={(e) => setAdjForm({ ...adjForm, amount: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">{t('employeeLedger.currency') || 'Currency'}</label>
                <select
                  value={adjForm.currency}
                  onChange={(e) => setAdjForm({ ...adjForm, currency: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="AFN">{t('employeeLedger.afn') || 'AFN'}</option>
                  <option value="USD">{t('employeeLedger.usd') || 'USD'}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">{t('employeeLedger.reasonDescription') || 'Reason / Description'}</label>
              <input
                type="text"
                placeholder="e.g. Eid Performance Bonus"
                value={adjForm.reason}
                onChange={(e) => setAdjForm({ ...adjForm, reason: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">{t('employeeLedger.notesOptional') || 'Notes (Optional)'}</label>
              <textarea
                rows="2"
                placeholder="Additional audit details..."
                value={adjForm.notes}
                onChange={(e) => setAdjForm({ ...adjForm, notes: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAdjustmentModal(false)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white"
              >
                {t('employeeLedger.cancel') || 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={adjSaving}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-emerald-600/20"
              >
                {adjSaving ? 'Saving...' : 'Post Adjustment'}
              </button>
            </div>
          </form>
        </BaseModal>
      )}

      {/* Pay Salary Modal */}
      <PaySalaryModal
        isOpen={showPayModal}
        onClose={() => setShowPayModal(false)}
        onSubmit={async (data) => {
          setPaySaving(true);
          setPayError('');
          try {
            await api.recordEmployeeSalaryPayment(employeeId, {
              period: data.period,
              amount: data.amount,
              payment_method: data.payment_method,
              notes: data.notes,
              currency: data.currency
            });
            setShowPayModal(false);
            await loadEmployeeAndLedger();
          } catch (err) {
            console.error('Failed to record salary payment:', err);
            setPayError(err.message || 'Failed to record salary payment.');
          } finally {
            setPaySaving(false);
          }
        }}
        employee={employee}
        outstandingBalance={ledgerData?.summary?.outstanding_balance || 0}
        selectedCurrency={selectedCurrency}
        isLoading={paySaving}
        error={payError}
      />
    </div>
  );
}
