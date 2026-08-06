import { AlertTriangle, Banknote, BriefcaseBusiness, CheckCircle2, Loader2, UserRound } from 'lucide-react';
import { memo, useState } from 'react';
import DateField from './DateField';
import QuickAddEmployeeModal from './QuickAddEmployeeModal';
import SmartAccountAutocomplete from './SmartAccountAutocomplete';

const translations = {
  English: {
    'Employee Information': 'Employee Information',
    'Base Monthly Salary': 'Base Monthly Salary',
    'Previous Month Balance': 'Previous Month Balance',
    'Adjusted Available Salary': 'Adjusted Available Salary',
    'Paid This Month': 'Paid This Month',
    'Remaining Salary': 'Remaining Salary',
    'Advance Taken': 'Advance Taken',
    'Salary Month': 'Salary Month',
    'Payment exceeds the remaining salary by ': 'Payment exceeds the remaining salary by ',
    'Other': 'Other',
    'Salary': 'Salary',
    'Rent': 'Rent',
    'Factory Expense': 'Factory Expense',
    'Home Expense': 'Home Expense',
    'Bottles Account': 'Bottles Account',
    'Office Expense': 'Office Expense',
    'Cash': 'Cash',
    'Bank': 'Bank',
    'Hawala': 'Hawala',
    'Clear': 'Clear'
  },
  Pashto: {
    'Employee Information': 'د کارکوونکي معلومات',
    'Base Monthly Salary': 'اساسي میاشتنۍ معاش',
    'Previous Month Balance': 'د تېرې میاشتې پاتې شوني',
    'Adjusted Available Salary': 'برابر شوی شته معاش',
    'Paid This Month': 'پدې میاشت کې تادیه شوي',
    'Remaining Salary': 'پاتې معاش',
    'Advance Taken': 'اخیستل شوی مخکینی تادیه',
    'Salary Month': 'د معاش میاشت',
    'Payment exceeds the remaining salary by ': 'تادیه له پاتې معاش څخه زیاته ده په: ',
    'Other': 'نور',
    'Salary': 'معاش',
    'Rent': 'کرایه',
    'Factory Expense': 'د فابریکې لګښت',
    'Home Expense': 'د کور لګښت',
    'Bottles Account': 'د بوتلونو حساب',
    'Office Expense': 'د دفتر لګښت',
    'Cash': 'نغدي',
    'Bank': 'بانک',
    'Hawala': 'حواله',
    'Clear': 'پاکول'
  },
  Dari: {
    'Employee Information': 'معلومات کارمند',
    'Base Monthly Salary': 'معاش ماهانه اساسی',
    'Previous Month Balance': 'باقیمانده ماه گذشته',
    'Adjusted Available Salary': 'معاش قابل دسترس تعدیل شده',
    'Paid This Month': 'پرداخت شده در این ماه',
    'Remaining Salary': 'معاش باقیمانده',
    'Advance Taken': 'مساعده گرفته شده',
    'Salary Month': 'ماه معاش',
    'Payment exceeds the remaining salary by ': 'پرداخت بیشتر از معاش باقیمانده است به مقدار: ',
    'Other': 'دیگر',
    'Salary': 'معاش',
    'Rent': 'کرایه',
    'Factory Expense': 'مصرف فابریکه',
    'Home Expense': 'مصرف خانه',
    'Bottles Account': 'حساب بوتلها',
    'Office Expense': 'مصرف دفتر',
    'Cash': 'نقدی',
    'Bank': 'بانک',
    'Hawala': 'حواله',
    'Clear': 'پاک کردن'
  }
};

function TransactionForm({
  title,
  type,
  form,
  setForm,
  dateDisplayFormat,
  saving = false,
  onSubmit,
  onClear,
  message,
  accounts = [],
  employees = [],
  selectedEmployee = null,
  selectedEmployeeSalary = null,
  onAccountNameChange,
  onAccountSelect,
  onQuickAddEmployee,
  language = 'English'
}) {
  const [quickAddName, setQuickAddName] = useState('');
  const update = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const rate = Number(form.exchange_rate || 0);
  const enteredAmount = selectedEmployee?.currency === 'USD'
    ? Number(form.usd_amount || 0) || (rate ? Number(form.cash_amount || 0) / rate : 0)
    : Number(form.cash_amount || 0) || Number(form.usd_amount || 0) * rate;
  const exceedsRemaining = selectedEmployeeSalary && enteredAmount > Number(selectedEmployeeSalary.remaining_salary || 0);
  const salaryCurrency = selectedEmployeeSalary?.currency || selectedEmployee?.currency || 'AFN';
  const salaryAmount = (value) => `${Number(value || 0).toLocaleString()} ${salaryCurrency}`;

  const t = (key) => {
    const lang = language || 'English';
    return translations[lang]?.[key] ?? translations['English']?.[key] ?? key;
  };

  function changePayrollKind(kind) {
    setForm((current) => ({
      ...current,
      payroll_kind: kind,
      category: 'salary',
      detail: `${kind === 'advance' ? 'Salary Advance' : 'Salary Payment'} - ${selectedEmployee?.full_name || current.account_name}`
    }));
  }

  const isEditing = Boolean(form.editingId);

  return (
    <div className={`glass-card form-card ${type === 'cash_in' ? 'cash-in-card' : 'cash-out-card'}`}>
      <div className="card-header flex items-center justify-between pb-3 mb-4 border-b border-zinc-100 dark:border-zinc-800">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>
        {isEditing && (
          <span className="text-xs font-medium text-amber-500 bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-200/50">
            Editing Mode
          </span>
        )}
      </div>
      
      <form className="entry-form flex flex-col gap-4" onSubmit={onSubmit}>
        <div className="form-group flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Date</label>
          <DateField value={form.date} onChange={(e) => update('date', e.target.value)} displayFormat={dateDisplayFormat} required />
        </div>

        <div className="form-group flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Account / Contact Name</label>
          <SmartAccountAutocomplete
            value={form.account_name}
            employees={employees}
            accounts={accounts}
            onChange={(value) => onAccountNameChange ? onAccountNameChange(value) : update('account_name', value)}
            onSelect={onAccountSelect}
            onQuickAddEmployee={(name) => setQuickAddName(name)}
          />
        </div>

        {type === 'cash_out' && form.employee_id && (
          <>
            <div className="employee-info-preview bg-slate-100/60 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-md">
              <header className="employee-info-header flex items-center gap-3 pb-3 mb-3 border-b border-slate-200/60 dark:border-slate-800/60">
                <span className="employee-info-avatar flex items-center justify-center w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300" aria-hidden="true">
                  <UserRound size={20} />
                </span>
                <div className="employee-info-copy flex flex-col">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400 dark:text-zinc-500">{t('Employee Information')}</span>
                  <strong className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{selectedEmployee?.full_name || form.account_name || 'Selected Employee'}</strong>
                  <small className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5"><BriefcaseBusiness size={12} /> {selectedEmployee?.position || 'Employee'}</small>
                </div>
              </header>
              <div className="employee-info-grid grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                <div className="salary-metric-row flex justify-between py-1 border-b border-zinc-100/50 dark:border-zinc-800/30">
                  <span className="text-zinc-500">{t('Base Monthly Salary')}</span>
                  <strong className="font-semibold text-zinc-800 dark:text-zinc-200">{salaryAmount(selectedEmployeeSalary?.monthly_salary)}</strong>
                </div>
                <div className="salary-metric-row flex justify-between py-1 border-b border-zinc-100/50 dark:border-zinc-800/30">
                  <span>{t('Previous Month Balance')}</span>
                  <strong className="font-semibold" style={{
                    color: (selectedEmployeeSalary?.previous_carry_forward_balance || 0) < 0 
                      ? '#ef4444' 
                      : (selectedEmployeeSalary?.previous_carry_forward_balance || 0) > 0 
                      ? '#10b981' 
                      : 'inherit'
                  }}>
                    {salaryAmount(selectedEmployeeSalary?.previous_carry_forward_balance)}
                  </strong>
                </div>
                <div className="salary-metric-row flex justify-between py-1 border-b border-zinc-100/50 dark:border-zinc-800/30">
                  <span className="text-zinc-500">{t('Adjusted Available Salary')}</span>
                  <strong className="font-semibold text-zinc-800 dark:text-zinc-200">{salaryAmount(selectedEmployeeSalary?.total_payable_salary)}</strong>
                </div>
                <div className="salary-metric-row is-paid flex justify-between py-1 border-b border-zinc-100/50 dark:border-zinc-800/30">
                  <span className="text-zinc-500">{t('Paid This Month')}</span>
                  <strong className="font-semibold text-zinc-800 dark:text-zinc-200">{salaryAmount(selectedEmployeeSalary?.paid_amount)}</strong>
                </div>
                <div className="salary-metric-row is-remaining flex justify-between py-1">
                  <span className="text-zinc-500">{t('Remaining Salary')}</span>
                  <strong className="font-bold text-indigo-500">{salaryAmount(selectedEmployeeSalary?.remaining_salary)}</strong>
                </div>
                <div className="salary-metric-row flex justify-between py-1">
                  <span className="text-zinc-500">{t('Advance Taken')}</span>
                  <strong className="font-semibold text-amber-500">{salaryAmount(selectedEmployeeSalary?.advance_taken)}</strong>
                </div>
              </div>
            </div>

            <div className="transaction-mode-toggle w-full mt-1" role="group" aria-label="Employee salary transaction type">
              <button 
                type="button" 
                className={`flex-1 text-center py-2 ${(form.payroll_kind || 'salary') === 'salary' ? 'active cash-out' : ''}`} 
                onClick={() => changePayrollKind('salary')}
              >
                Salary Payment
              </button>
              <button 
                type="button" 
                className={`flex-1 text-center py-2 ${form.payroll_kind === 'advance' ? 'active cash-out' : ''}`} 
                onClick={() => changePayrollKind('advance')}
              >
                Salary Advance
              </button>
            </div>

            <div className="form-group flex flex-col gap-1.5 mt-1">
              <label className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">{t('Salary Month')}</label>
              <input type="month" value={String(form.salary_month || '').slice(0, 7)} onChange={(e) => update('salary_month', `${e.target.value}-01`)} required />
            </div>

            {exceedsRemaining ? (
              <div className="salary-overpayment-warning flex items-start gap-2 p-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-lg border border-red-100 dark:border-red-950/50 text-xs">
                <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                <span>{t('Payment exceeds the remaining salary by ')}{(enteredAmount - selectedEmployeeSalary.remaining_salary).toLocaleString(undefined, { maximumFractionDigits: 2 })} {selectedEmployeeSalary.currency}.</span>
              </div>
            ) : null}
          </>
        )}

        <div className="form-group flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Detail</label>
          <input type="text" value={form.detail} onChange={(e) => update('detail', e.target.value)} placeholder="Entry description..." required={!form.account_name?.trim()} dir="auto" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="form-group flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">AFN Amount</label>
            <input type="number" value={form.cash_amount} onChange={(e) => update('cash_amount', e.target.value)} placeholder="0.00" step="0.01" min="0" />
          </div>

          <div className="form-group flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">USD Amount</label>
            <input type="number" value={form.usd_amount} onChange={(e) => update('usd_amount', e.target.value)} placeholder="0.00" step="0.01" min="0" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="form-group flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Exchange Rate</label>
            <input type="number" value={form.exchange_rate} onChange={(e) => update('exchange_rate', e.target.value)} placeholder="64.30" step="0.01" min="0" />
          </div>

          <div className="form-group flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Category</label>
            <select value={form.category} onChange={(e) => update('category', e.target.value)}>
              <option value="other">{t('Other')}</option>
              <option value="salary">{t('Salary')}</option>
              <option value="rent">{t('Rent')}</option>
              <option value="factory_expense">{t('Factory Expense')}</option>
              <option value="home_expense">{t('Home Expense')}</option>
              <option value="bottles_account">{t('Bottles Account')}</option>
              <option value="office_expense">{t('Office Expense')}</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="form-group flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Payment Method</label>
            <select value={form.payment_method} onChange={(e) => update('payment_method', e.target.value)}>
              <option value="cash">{t('Cash')}</option>
              <option value="bank">{t('Bank')}</option>
              <option value="hawala">{t('Hawala')}</option>
              <option value="other">{t('Other')}</option>
            </select>
          </div>

          <div className="form-group flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Note</label>
            <input type="text" value={form.note} onChange={(e) => update('note', e.target.value)} placeholder="Optional note..." dir="auto" />
          </div>
        </div>

        <div className="flex gap-3 mt-2">
          <button className="ghost-btn flex-1 py-2.5 transition-all active:scale-95" type="button" onClick={onClear} disabled={saving}>{t('Clear')}</button>
          <button 
            className={`primary-btn ${type === 'cash_out' ? 'danger' : ''} flex-1 py-2.5 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md`} 
            type="submit" 
            disabled={saving}
          >
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin shrink-0" />
                <span>Saving...</span>
              </>
            ) : (
              <span>{type === 'cash_out' ? 'Save Cash Out' : 'Save Cash In'}</span>
            )}
          </button>
        </div>
        
        {message && (
          <div className={`form-message text-center text-xs mt-2 py-2.5 px-3.5 rounded-xl flex items-center justify-center gap-2 font-medium transition-all shadow-xs ${message.includes('Saved') || message.includes('success') ? 'text-emerald-700 bg-emerald-50/90 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80' : 'text-rose-700 bg-rose-50/90 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/80'}`} aria-live="polite">
            {message.includes('Saved') || message.includes('success') ? <CheckCircle2 size={16} className="shrink-0 text-emerald-600 dark:text-emerald-400" /> : <AlertTriangle size={16} className="shrink-0 text-rose-600 dark:text-rose-400" />}
            <span>{message}</span>
          </div>
        )}
      </form>
      
      {quickAddName && (
        <QuickAddEmployeeModal
          initialName={quickAddName}
          onClose={() => setQuickAddName('')}
          onSave={async (payload) => {
            const employee = await onQuickAddEmployee(payload);
            onAccountSelect({
              key: `employee-${employee.id}`,
              kind: 'employee',
              name: employee.full_name,
              employee,
              accountId: employee.account_id
            });
            setQuickAddName('');
          }}
        />
      )}
    </div>
  );
}

export default memo(TransactionForm);
