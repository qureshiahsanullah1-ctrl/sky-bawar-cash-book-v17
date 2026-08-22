import { Banknote, BookOpenText, Briefcase, Building2, Camera, CheckCircle2, CircleDollarSign, Clock3, Download, Edit, FileSpreadsheet, MoreVertical, Printer, Search, Trash2, UsersRound } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { currency, csvCell, dateLabel, jalaliDateLabel, jalaliFullDateLabel, jalaliPeriodLabel, resolveAvatarUrl } from '../utils/format';
import { calculatePayrollMetrics, employeeSalarySnapshot } from '../utils/payroll';
import BaseModal from '../components/BaseModal';
import EmployeeLedgerModal from '../components/EmployeeLedgerModal';
import SalaryPrintModal from '../components/SalaryPrintModal';
import EditableCombobox from '../components/EditableCombobox';
import { DEFAULT_POSITIONS, DEFAULT_DEPARTMENTS } from '../data/employeeOptions';
import { useCompany } from '../context/CompanyContext';


function unescapeText(str) {
  if (typeof str !== 'string') return String(str ?? '');
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

function escapeHtml(str) {
  if (typeof str !== 'string') return String(str ?? '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const tabs = ['Overview', 'Employees', 'Salary Payments', 'Reports'];
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function getMonthName(monthNum) {
  const index = Number(monthNum) - 1;
  return monthNames.at(index) || '';
}

const emptyEmployee = {
  full_name: '',
  father_name: '',
  phone: '',
  position: '',
  department: '',
  company_id: 'all',
  joining_date: '',
  monthly_salary: '',
  currency: 'AFN',
  status: 'active',
  notes: '',
  avatar_url: ''
};

function currentMonthYear() {
  const date = new Date();
  return { month: date.getMonth() + 1, year: date.getFullYear() };
}

function imageFileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(new Error('Unable to read selected image.'));
      reader.readAsDataURL(file);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxSize = 400;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > maxSize) {
            height = Math.round((height * maxSize) / width);
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = Math.round((width * maxSize) / height);
            height = maxSize;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/webp', 0.82);
        resolve(dataUrl || String(reader.result || ''));
      };
      img.onerror = () => resolve(String(reader.result || ''));
      img.src = String(reader.result || '');
    };
    reader.onerror = () => reject(new Error('Unable to read selected image.'));
    reader.readAsDataURL(file);
  });
}

export default function EmployeesSalary({
  employees = [],
  transactions = [],
  onCreateEmployee,
  onUpdateEmployee,
  onOpenCashBook,
  onSalaryPaymentSaved,
  onEmployeeSalaryChanged,
  onEmployeeAvatarChanged,
  onEmployeeDeleted,
  currentUser,
  companyName = 'Cashbook Of All companies',
  companyLogo = ''
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { companies = [] } = useCompany();
  const [activeTab, setActiveTab] = useState('Overview');
  const [employeeForm, setEmployeeForm] = useState(emptyEmployee);
  const [editingEmployeeId, setEditingEmployeeId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState('');
  const [toast, setToast] = useState('');
  const [filters, setFilters] = useState({ search: '', department: '', status: '', ...currentMonthYear() });
  const [payingRow, setPayingRow] = useState(null);
  const [editingSalaryRow, setEditingSalaryRow] = useState(null);
  const [deletingEmployeeId, setDeletingEmployeeId] = useState(null);
  const [uploadingAvatarId, setUploadingAvatarId] = useState(null);
  const [selectedLedgerEmployee, setSelectedLedgerEmployee] = useState(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [defaultPrintMode, setDefaultPrintMode] = useState('all');


  const salaryTransactions = useMemo(
    () => transactions.filter((transaction) => transaction.category === 'salary' && transaction.transaction_type === 'cash_out'),
    [transactions]
  );

  const payrollMetrics = useMemo(
    () => calculatePayrollMetrics(employees, transactions, filters.month, filters.year),
    [employees, transactions, filters.month, filters.year]
  );

  const monthlySalaryPaid = report?.summary?.total_paid_this_month ?? payrollMetrics.total_paid_afn;
  const pending = report?.summary?.total_remaining_salary ?? payrollMetrics.total_remaining_afn;
  const totalMonthlyPayroll = report?.summary?.total_monthly_salary ?? payrollMetrics.total_monthly_salary_afn;

  const departments = useMemo(() => [...new Set(employees.map((employee) => employee.department).filter(Boolean))].sort(), [employees]);
  const existingPositions = useMemo(() => [...new Set(employees.map((employee) => employee.position).filter(Boolean))].sort(), [employees]);

  const positionOptions = useMemo(() => {
    const customList = existingPositions.map((pos) => ({
      value: pos,
      detail: 'Existing employee position in system',
      category: 'System'
    }));
    const defaultVals = new Set(DEFAULT_POSITIONS.map((p) => p.value.toLowerCase()));
    const uniqueCustom = customList.filter((c) => !defaultVals.has(c.value.toLowerCase()));
    return [...uniqueCustom, ...DEFAULT_POSITIONS];
  }, [existingPositions]);

  const departmentOptions = useMemo(() => {
    const customList = departments.map((dept) => ({
      value: dept,
      detail: 'Existing department in system',
      category: 'System'
    }));
    const defaultVals = new Set(DEFAULT_DEPARTMENTS.map((d) => d.value.toLowerCase()));
    const uniqueCustom = customList.filter((c) => !defaultVals.has(c.value.toLowerCase()));
    return [...uniqueCustom, ...DEFAULT_DEPARTMENTS];
  }, [departments]);

  useEffect(() => {
    loadSalaryReport(filters.month, filters.year);
  }, [filters.month, filters.year, employees.length]);

  useEffect(() => {
    api.getSalaryChangeReport().then(setSalaryChanges).catch(() => setSalaryChanges([]));
  }, [employees.length]);

  async function loadSalaryReport(month = filters.month, year = filters.year) {
    setReportLoading(true);
    setReportError('');
    try {
      const data = await api.getSalaryReport(month, year);
      setReport(data);
    } catch (error) {
      setReportError(error.message);
    } finally {
      setReportLoading(false);
    }
  }

  function showLocalToast(message) {
    setToast(message);
    window.clearTimeout(showLocalToast.timer);
    showLocalToast.timer = window.setTimeout(() => setToast(''), 2600);
  }

  function handleEditEmployee(employeeOrRow) {
    const employee = employeeOrRow.id
      ? employeeOrRow
      : employees.find((emp) => Number(emp.id) === Number(employeeOrRow.employee_id));
    if (!employee) return;

    setEmployeeForm({
      full_name: unescapeText(employee.full_name || ''),
      father_name: unescapeText(employee.father_name || ''),
      phone: unescapeText(employee.phone || ''),
      position: unescapeText(employee.position || ''),
      department: unescapeText(employee.department || ''),
      company_id: employee.company_id || 'all',
      joining_date: employee.joining_date || new Date().toISOString().slice(0, 10),
      monthly_salary: String(employee.monthly_salary || ''),
      currency: employee.currency || 'AFN',
      status: employee.status || 'active',
      notes: unescapeText(employee.notes || ''),
      avatar_url: employee.avatar_url || employee.avatarUrl || employee.photo || ''
    });
    setEditingEmployeeId(employee.id);
    setActiveTab('Employees');
  }

  async function submitEmployee(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = { ...employeeForm, monthly_salary: Number(employeeForm.monthly_salary || 0) };
      if (editingEmployeeId) {
        await onUpdateEmployee(editingEmployeeId, payload);
        setEditingEmployeeId(null);
      } else {
        await onCreateEmployee(payload);
      }
      setEmployeeForm(emptyEmployee);
      await loadSalaryReport();
    } finally {
      setSaving(false);
    }
  }

  async function saveSalaryPayment(payload) {
    const payment = await api.createSalaryPayment(payload);
    await loadSalaryReport(payload.month, payload.year);
    if (onSalaryPaymentSaved) await onSalaryPaymentSaved(payment);
    showLocalToast('Salary payment saved and Cashbook updated.');
    setPayingRow(null);
  }

  async function saveSalaryChange(employeeId, payload) {
    await api.changeEmployeeSalary(employeeId, payload);
    if (onEmployeeSalaryChanged) await onEmployeeSalaryChanged();
    const [nextReport, nextChanges] = await Promise.all([
      api.getSalaryReport(filters.month, filters.year),
      api.getSalaryChangeReport()
    ]);
    setReport(nextReport);
    setSalaryChanges(nextChanges);
    setEditingSalaryRow(null);
    showLocalToast('Employee salary updated. Old salary records remain unchanged.');
  }

  async function deleteEmployee(record) {
    const employeeId = Number(record.employee_id || record.id);
    const employeeName = record.employee_name || record.full_name || 'this employee';
    const employeeCode = record.employee_code ? ` (${record.employee_code})` : '';
    if (!employeeId) return;
    const confirmed = window.confirm(`Are you sure you want to delete ${employeeName}?`);
    if (!confirmed) return;
    setDeletingEmployeeId(employeeId);
    setReportError('');
    try {
      await api.deleteEmployee(employeeId);
      if (onEmployeeDeleted) await onEmployeeDeleted();
      await loadSalaryReport(filters.month, filters.year);
      showLocalToast(`${employeeName}${employeeCode} deleted successfully.`);
    } catch (error) {
      const message = error.message || 'Failed to delete employee.';
      setReportError(message);
      showLocalToast(message);
    } finally {
      setDeletingEmployeeId(null);
    }
  }

  async function updateEmployeeAvatar(employee, file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showLocalToast('Please select a valid image file.');
      return;
    }
    setUploadingAvatarId(Number(employee.id));
    try {
      const avatarUrl = await imageFileToDataUrl(file);
      const updated = await api.updateEmployee(employee.id, { avatar_url: avatarUrl });
      if (onEmployeeAvatarChanged) await onEmployeeAvatarChanged(updated);
      await loadSalaryReport(filters.month, filters.year);
      showLocalToast('Employee picture updated.');
    } catch (error) {
      showLocalToast(error.message || 'Failed to update employee picture.');
    } finally {
      setUploadingAvatarId(null);
    }
  }

  const rows = useMemo(() => {
    const source = report?.rows || [];
    const search = filters.search.trim().toLowerCase();
    return source.filter((row) => {
      const matchesSearch = !search || [row.employee_name, row.employee_code, row.department, row.position].some((value) => String(value || '').toLowerCase().includes(search));
      const matchesDepartment = !filters.department || row.department === filters.department;
      const matchesStatus = !filters.status || row.payment_status === filters.status;
      const matchesCompany = !filters.company_id || filters.company_id === 'all' || (row.company_id || 'all') === 'all' || row.company_id === filters.company_id;
      return matchesSearch && matchesDepartment && matchesStatus && matchesCompany;
    });
  }, [report, filters.search, filters.department, filters.status, filters.company_id]);

  const summary = report?.summary || {
    total_employees: employees.length,
    total_monthly_salary: employees.reduce((total, employee) => total + Number(employee.monthly_salary || 0), 0),
    total_payable_salary: report?.summary?.total_payable_salary ?? employees.reduce((total, employee) => total + Number(employeeSalarySnapshot(employee, transactions)?.total_payable_salary || employee.monthly_salary || 0), 0),
    total_paid_this_month: monthlySalaryPaid,
    total_remaining_salary: pending,
    fully_paid_employees: 0,
    unpaid_employees: employees.length,
    partial_paid_employees: 0
  };

  function printReport(mode = 'all') {
    setDefaultPrintMode(mode);
    setIsPrintModalOpen(true);
  }

  function exportExcel() {
    const header = ['S.No', 'Employee ID', 'Employee Name', 'Department / Position', 'Base Monthly Salary', 'Previous Carry Forward', 'Total Payable Salary', 'Paid Salary', 'Closing Carry Forward', 'Payment Status', 'Last Payment Date'];
    const body = rows.map((row, index) => [
      index + 1,
      row.employee_code,
      row.employee_name,
      `${row.department || '-'} / ${row.position || '-'}`,
      row.monthly_salary,
      row.previous_carry_forward_balance || 0,
      row.total_payable_salary ?? row.monthly_salary,
      row.paid_salary,
      row.remaining_salary,
      row.payment_status,
      row.last_payment_date || ''
    ]);
    const csv = [header, ...body].map((line) => line.map(csvCell).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `employees-salary-report-${filters.year}-${String(filters.month).padStart(2, '0')}.xls`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="salary-page">
      {toast && <div className="success-banner">{toast}</div>}
      <header className="salary-page-header">
        <div>
          <p className="eyebrow">{t('payroll.eyebrow')}</p>
          <h3>{t('payroll.title')}</h3>
          <p>{t('payroll.description')}</p>
        </div>
        <div className="salary-page-actions flex items-center gap-2 flex-wrap">
          <button 
            className="ghost-btn flex items-center gap-1.5 border border-slate-200 dark:border-slate-700" 
            type="button" 
            onClick={() => printReport('all')}
            title="Open Print Options & Custom Reports"
          >
            <Printer size={16} />
            <span>Print Reports (چاپ)</span>
          </button>
          <button className="ghost-btn" type="button" onClick={() => setActiveTab('Employees')}>{t('payroll.addEmployee')}</button>
          <button className="primary-btn" type="button" onClick={() => setActiveTab('Reports')}>{t('payroll.salaryReport')}</button>
        </div>
      </header>


      <nav className="salary-tabs" aria-label="Employees and salary sections">
        {tabs.map((tab) => {
          let label = tab;
          if (tab === 'Overview') label = t('payroll.overview');
          else if (tab === 'Employees') label = t('payroll.employees');
          else if (tab === 'Salary Payments') label = t('payroll.salaryPayments');
          else if (tab === 'Reports') label = t('payroll.salaryReport');
          return (
            <button key={tab} type="button" className={`salary-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
              {label}
            </button>
          );
        })}
      </nav>

      {activeTab === 'Overview' && (
        <>
          <div className="salary-metric-grid">
            <SalaryStat icon={UsersRound} label={t('payroll.employees')} value={employees.length} tone="blue" />
            <SalaryStat icon={Building2} label={t('payroll.allDepartments')} value={departments.length} tone="violet" />
            <SalaryStat icon={Banknote} label={t('payroll.totalPaid')} value={currency(monthlySalaryPaid)} tone="green" />
            <SalaryStat icon={Clock3} label={t('payroll.totalRemaining')} value={currency(pending)} tone="amber" />
          </div>
          <div className="salary-overview-grid">
            <article className="glass-card salary-panel">
              <div className="salary-panel-heading"><div><p className="eyebrow">{t('payroll.currentPayroll')}</p><h3>{t('payroll.salaryActivity')}</h3></div><CircleDollarSign size={24} /></div>
              <div className="salary-activity-summary"><span>{t('payroll.paymentsRecorded')}</span><strong>{report?.payments?.length ?? salaryTransactions.length}</strong></div>
              <div className="salary-progress"><span style={{ width: summary.total_monthly_salary ? `${Math.min((summary.total_paid_this_month / summary.total_monthly_salary) * 100, 100)}%` : '0%' }} /></div>
              <p className="salary-muted">{t('payroll.paymentsNote')}</p>
            </article>
            <EmployeeList 
              employees={employees} 
              transactions={transactions} 
              reportRows={report?.rows} 
              onPay={(row) => { setActiveTab('Reports'); setPayingRow(row); }} 
              onOpenLedger={(emp) => setSelectedLedgerEmployee(emp)}
              onEditEmployee={currentUser?.role === 'Administrator' ? handleEditEmployee : null} 
              onAddEmployee={currentUser?.role === 'Administrator' ? () => { setEmployeeForm(emptyEmployee); setEditingEmployeeId(null); setActiveTab('Employees_Add'); } : null}
              onEditSalary={currentUser?.role === 'Administrator' ? setEditingSalaryRow : null} 
              onDeleteEmployee={currentUser?.role === 'Administrator' ? deleteEmployee : null} 
              onChangeAvatar={currentUser?.role === 'Administrator' ? updateEmployeeAvatar : null} 
              deletingEmployeeId={deletingEmployeeId} 
              uploadingAvatarId={uploadingAvatarId} 
            />
          </div>
        </>
      )}

      {(activeTab === 'Employees' || activeTab === 'Employees_Add') && (
        <>
          <EmployeeList 
            employees={employees} 
            transactions={transactions} 
            reportRows={report?.rows} 
            expanded 
            onPay={(row) => { setActiveTab('Reports'); setPayingRow(row); }} 
            onOpenLedger={(emp) => setSelectedLedgerEmployee(emp)}
            onEditEmployee={handleEditEmployee} 
            onAddEmployee={() => { setEmployeeForm(emptyEmployee); setEditingEmployeeId(null); setActiveTab('Employees_Add'); }}
            onEditSalary={setEditingSalaryRow} 
            onDeleteEmployee={deleteEmployee} 
            onChangeAvatar={updateEmployeeAvatar} 
            deletingEmployeeId={deletingEmployeeId} 
            uploadingAvatarId={uploadingAvatarId} 
          />
          <BaseModal 
            isOpen={editingEmployeeId !== null || activeTab === 'Employees_Add'} 
            onClose={() => { setEmployeeForm(emptyEmployee); setEditingEmployeeId(null); setActiveTab('Employees'); }}
            title={editingEmployeeId ? `Edit Employee Profile` : 'Add New Employee'}
            maxWidth="840px"
            panelClass="employee-create-modal"
            footer={
              <>
                <button 
                  type="button" 
                  className="ghost-btn modal-btn-cancel" 
                  onClick={() => { setEmployeeForm(emptyEmployee); setEditingEmployeeId(null); setActiveTab('Employees'); }} 
                  disabled={saving}
                >
                  {t('payroll.cancel')}
                </button>
                <button 
                  type="submit" 
                  form="employeeForm" 
                  className="primary-btn modal-btn-save" 
                  disabled={saving}
                >
                  {saving ? 'Saving...' : (editingEmployeeId ? 'Update Employee' : 'Save Employee')}
                </button>
              </>
            }
          >
            <form id="employeeForm" className="modal-form flex flex-col gap-4" onSubmit={submitEmployee}>
              {/* 1. PERSONAL INFORMATION CARD */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700/80">
                <h4 className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-2">{t('payroll.personalInfo')}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="form-field">
                    <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200 mb-1 block">{t('payroll.fullNameRequired')}</span>
                    <input 
                      className="form-control text-xs" 
                      name="fullName" 
                      value={employeeForm.full_name} 
                      onChange={(e) => setEmployeeForm({ ...employeeForm, full_name: e.target.value })} 
                      placeholder="e.g. Ahmad Shah" 
                      required 
                      autoComplete="name"
                    />
                  </label>

                  <label className="form-field">
                    <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200 mb-1 block">{t('payroll.fatherName')}</span>
                    <input 
                      className="form-control text-xs" 
                      name="fatherName" 
                      value={employeeForm.father_name} 
                      onChange={(e) => setEmployeeForm({ ...employeeForm, father_name: e.target.value })} 
                      placeholder="e.g. Mohammad" 
                    />
                  </label>

                  <label className="form-field">
                    <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200 mb-1 block">{t('payroll.phoneNumber')}</span>
                    <input 
                      className="form-control text-xs" 
                      name="phoneNumber" 
                      value={employeeForm.phone} 
                      onChange={(e) => setEmployeeForm({ ...employeeForm, phone: e.target.value })} 
                      placeholder="e.g. +93 700 123 456" 
                      autoComplete="tel"
                    />
                  </label>

                  <label className="form-field">
                    <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200 mb-1 block">{t('payroll.employeeCode')}</span>
                    <input 
                      className="form-control text-xs" 
                      name="employeeCode" 
                      value={employeeForm.employee_code || ''} 
                      onChange={(e) => setEmployeeForm({ ...employeeForm, employee_code: e.target.value })} 
                      placeholder="e.g. EMP-001" 
                    />
                  </label>

                  <label className="form-field sm:col-span-2">
                    <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200 mb-1 block">{t('payroll.profilePhoto')}</span>
                    <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="w-10 h-10 rounded-full bg-slate-900 border border-blue-500 text-white font-bold text-sm flex items-center justify-center shrink-0 overflow-hidden">
                        {employeeForm.avatar_url ? (
                          <img src={employeeForm.avatar_url} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                          (employeeForm.full_name || 'E').slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <div className="flex-1">
                        <input 
                          type="file" 
                          accept="image/*" 
                          className="form-control text-xs py-1 px-2" 
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                              const dataUrl = await imageFileToDataUrl(file);
                              setEmployeeForm((prev) => ({ ...prev, avatar_url: dataUrl }));
                            } catch (err) {
                              showLocalToast('Failed to process selected image.');
                            }
                          }}
                        />
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* 2. EMPLOYMENT DETAILS CARD */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700/80">
                <h4 className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-2">{t('payroll.employmentDetails')}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="form-field">
                    <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200 mb-1 block">{t('payroll.positionJobTitle')}</span>
                    <EditableCombobox
                      name="position"
                      value={employeeForm.position}
                      onChange={(val) => setEmployeeForm({ ...employeeForm, position: val })}
                      options={positionOptions}
                      placeholder="Select option or type position..."
                      icon={Briefcase}
                      required
                    />
                  </label>

                  <label className="form-field">
                    <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200 mb-1 block">{t('payroll.department')}</span>
                    <EditableCombobox
                      name="department"
                      value={employeeForm.department}
                      onChange={(val) => setEmployeeForm({ ...employeeForm, department: val })}
                      options={departmentOptions}
                      placeholder="Select option or type department..."
                      icon={Building2}
                    />
                  </label>

                  <label className="form-field">
                    <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200 mb-1 block">{t('payroll.assignedCompany')}</span>
                    <select 
                      className="form-select text-xs font-bold" 
                      name="company_id" 
                      value={employeeForm.company_id || 'all'} 
                      onChange={(e) => setEmployeeForm({ ...employeeForm, company_id: e.target.value })}
                    >
                      <option value="all">🌐 {t('payroll.allCompaniesShared')}</option>
                      {companies.map((comp) => (
                        <option key={comp.id} value={comp.id}>
                          🏬 {comp.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="form-field">
                    <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200 mb-1 block">{t('payroll.employmentStatus')}</span>
                    <select 
                      className="form-select text-xs" 
                      name="status" 
                      value={employeeForm.status} 
                      onChange={(e) => setEmployeeForm({ ...employeeForm, status: e.target.value })}
                    >
                      <option value="active">{t('payroll.statusActive')}</option>
                      <option value="inactive">{t('payroll.statusInactive')}</option>
                      <option value="on_leave">{t('payroll.statusOnLeave')}</option>
                    </select>
                  </label>

                  <label className="form-field sm:col-span-2">
                    <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200 mb-1 block">{t('payroll.joiningDateBenchmark')}</span>
                    <input 
                      className="form-control text-xs" 
                      name="joiningDate" 
                      type="date" 
                      value={employeeForm.joining_date || ''} 
                      onChange={(e) => setEmployeeForm({ ...employeeForm, joining_date: e.target.value })} 
                    />
                    <span className="text-[10px] text-slate-500 mt-0.5 block">
                      {t('payroll.salaryCarryForwardHint')}
                    </span>
                  </label>
                </div>
              </div>

              {/* 3. SALARY & REMARKS CARD */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/70 rounded-xl border border-slate-200 dark:border-slate-700/80">
                <h4 className="text-xs font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 mb-2">{t('payroll.salaryInfoRemarks')}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="form-field">
                    <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200 mb-1 block">{t('payroll.monthlyBaseSalary')}</span>
                    <input 
                      className="form-control text-xs font-mono font-bold" 
                      name="monthlySalary" 
                      type="number" 
                      min="0" 
                      step="0.01" 
                      value={employeeForm.monthly_salary} 
                      onChange={(e) => setEmployeeForm({ ...employeeForm, monthly_salary: e.target.value })} 
                      placeholder="0.00" 
                      required 
                    />
                  </label>

                  <label className="form-field">
                    <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200 mb-1 block">{t('payroll.currencyRequired')}</span>
                    <select 
                      className="form-select text-xs font-bold" 
                      name="currency" 
                      value={employeeForm.currency} 
                      onChange={(e) => setEmployeeForm({ ...employeeForm, currency: e.target.value })}
                    >
                      <option value="AFN">{t('payroll.afn')}</option>
                      <option value="USD">{t('payroll.usd')}</option>
                    </select>
                  </label>

                  <label className="form-field sm:col-span-2">
                    <span className="text-xs font-extrabold text-slate-700 dark:text-slate-200 mb-1 block">{t('payroll.notesRemarks')}</span>
                    <textarea 
                      className="form-textarea text-xs" 
                      name="notes" 
                      value={employeeForm.notes} 
                      onChange={(e) => setEmployeeForm({ ...employeeForm, notes: e.target.value })} 
                      placeholder="Optional employee notes..." 
                      rows={2} 
                    />
                  </label>
                </div>
              </div>
            </form>
          </BaseModal>
        </>
      )}
      {activeTab === 'Salary Payments' && (
        <article className="glass-card salary-panel">
          <div className="salary-panel-heading flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <p className="eyebrow">{t('payroll.paymentHistory')}</p>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                {t('payroll.salaryCashOutRecords')}
              </h3>
              <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 block">
                {salaryTransactions.length} recorded payroll disbursements
              </span>
            </div>
            <button 
              className="primary-btn shrink-0 flex items-center justify-center gap-1.5 self-start sm:self-auto py-2.5 px-4" 
              type="button" 
              onClick={() => setActiveTab('Reports')}
            >
              <Banknote size={16} />
              <span>{t('payroll.paySalary')}</span>
            </button>
          </div>

          {salaryTransactions.length ? (
            <div className="salary-payment-cards-grid grid grid-cols-1 md:grid-cols-2 gap-3">
              {salaryTransactions.slice().reverse().map((tx) => {
                const emp = employees.find((e) => Number(e.id) === Number(tx.employee_id) || Number(e.account_id) === Number(tx.account_id));
                const empName = emp?.full_name || tx.account_name || 'Employee';
                const empCode = emp?.employee_code || (emp?.id ? `EMP-${emp.id}` : '');
                const txDate = tx.date || new Date().toISOString().slice(0, 10);
                const gDate = dateLabel(txDate);
                const jDate = jalaliDateLabel(txDate);
                const jMonth = jalaliFullDateLabel(txDate).split(' ')[1] || '';
                const period = tx.salary_month || txDate.slice(0, 7);
                const jPeriod = jalaliPeriodLabel(period);
                const isUSD = (tx.currency || emp?.currency || 'AFN').toUpperCase() === 'USD';
                const paidAmount = isUSD ? Number(tx.usd_out || tx.amount || 0) : Number(tx.cash_out_afn || tx.amount || 0);
                const paidCurr = isUSD ? 'USD' : 'AFN';

                return (
                  <div 
                    key={tx.id} 
                    className="p-4 rounded-2xl bg-white/90 dark:bg-slate-850/90 backdrop-blur-md border border-slate-200/80 dark:border-slate-700/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-3"
                  >
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                          {(empName || 'E').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                            {unescapeText(empName)}
                          </h4>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap text-xs text-slate-500 dark:text-slate-400">
                            {empCode && (
                              <span className="font-mono font-bold text-[10px] bg-slate-100 dark:bg-slate-700/80 px-1.5 py-0.2 rounded text-slate-700 dark:text-slate-300">
                                {empCode}
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400">&bull;</span>
                            <span className="text-[11px] font-medium">{tx.payment_method || 'Cash'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <strong className="text-base sm:text-lg font-black font-mono text-emerald-600 dark:text-emerald-400 block">
                          {currency(paidAmount, paidCurr)}
                        </strong>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 inline-block mt-0.5">
                          Disbursed
                        </span>
                      </div>
                    </div>

                    {/* Dual Date & Period Details */}
                    <div className="grid grid-cols-2 gap-2 p-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 text-xs">
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Payment Date / تاریخ</span>
                        <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{gDate}</div>
                        <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono font-medium">{jDate} ({jMonth})</div>
                      </div>
                      <div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Payroll Period / دوره</span>
                        <div className="font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{period}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{jPeriod}</div>
                      </div>
                    </div>

                    {tx.detail && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50/50 dark:bg-slate-800/40 p-2 rounded-lg border border-slate-100 dark:border-slate-800 italic">
                        &ldquo;{unescapeText(tx.detail)}&rdquo;
                      </p>
                    )}

                    {emp && (
                      <div className="pt-1 flex items-center justify-end">
                        <button
                          type="button"
                          onClick={() => setSelectedLedgerEmployee(emp)}
                          className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 py-1 px-2.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/50 dark:border-blue-800/50"
                        >
                          <BookOpenText size={13} />
                          <span>View Employee Ledger</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState 
              title="No salary payments yet" 
              body="Open the Employees Salary Report and use Pay Salary for the first payment." 
              action="Open Report" 
              onAction={() => setActiveTab('Reports')} 
            />
          )}
        </article>
      )}


      {activeTab === 'Reports' && (
        <EmployeesSalaryReport
          rows={rows}
          summary={summary}
          filters={filters}
          setFilters={setFilters}
          departments={departments}
          loading={reportLoading}
          error={reportError}
          onRefresh={() => loadSalaryReport()}
          onPay={setPayingRow}
          onPrint={printReport}
          onPdf={printReport}
          onExcel={exportExcel}
          onEditSalary={setEditingSalaryRow}
          onEditEmployee={handleEditEmployee}
          onDeleteEmployee={deleteEmployee}
          deletingEmployeeId={deletingEmployeeId}
          salaryChanges={salaryChanges}
          companyName={companyName}
          companyLogo={companyLogo}
        />
      )}

      {payingRow && (
        <SalaryPaymentModal
          row={payingRow}
          month={filters.month}
          year={filters.year}
          onClose={() => setPayingRow(null)}
          onSave={saveSalaryPayment}
        />
      )}
      {editingSalaryRow && (
        <EditEmployeeSalaryModal
          row={editingSalaryRow}
          currentUser={currentUser}
          onClose={() => setEditingSalaryRow(null)}
          onSave={saveSalaryChange}
        />
      )}
      {selectedLedgerEmployee && (
        <EmployeeLedgerModal
          employee={selectedLedgerEmployee}
          currentUser={currentUser}
          onClose={() => setSelectedLedgerEmployee(null)}
          onOpenPaySalary={(emp) => {
            const row = report?.rows?.find((r) => Number(r.employee_id) === Number(emp.id));
            setSelectedLedgerEmployee(null);
            setActiveTab('Reports');
            setPayingRow(row || {
              employee_id: emp.id,
              employee_name: emp.full_name,
              employee_code: emp.employee_code,
              monthly_salary: emp.monthly_salary,
              remaining_salary: emp.monthly_salary,
            });
          }}
          onUpdateEmployee={(updated) => {
            if (onUpdateEmployee) onUpdateEmployee(updated);
          }}
        />
      )}

      <SalaryPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        rows={rows}
        transactions={transactions}
        summary={summary}
        filters={filters}
        departments={departments}
        companyName={companyName}
        companyLogo={companyLogo}
        currencyCode={currencyCode}
      />
    </section>
  );
}

function EmployeesSalaryReport({ rows, summary, filters, setFilters, departments, loading, error, onRefresh, onPay, onPrint, onPdf, onExcel, onEditSalary, onEditEmployee, onDeleteEmployee, deletingEmployeeId, salaryChanges, companyName, companyLogo }) {
  const { t } = useTranslation();
  const years = Array.from({ length: 6 }, (_, index) => new Date().getFullYear() - 3 + index);
  return (
    <article className="glass-card salary-panel salary-report-workspace">
      <div className="salary-panel-heading flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <p className="eyebrow">{t('payroll.monthlyPayroll')}</p>
          <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
            {t('payroll.salaryReport')}
          </h3>
        </div>
        <div className="salary-report-actions flex flex-wrap items-center gap-2">
          <button 
            className="primary-btn flex items-center gap-1.5 py-2 px-3.5" 
            type="button" 
            onClick={() => onPrint('all')}
            title="Open Print Options & Custom Filters"
          >
            <Printer size={15} /> 
            <span>Print Options (چاپ راپور)</span>
          </button>
          <button 
            className="ghost-btn flex items-center gap-1.5 py-2 px-3 text-xs font-bold border border-slate-200 dark:border-slate-700" 
            type="button" 
            onClick={() => onPrint('salaries_only')} 
            title="Print employee list with contracted base salaries only"
          >
            <Banknote size={14} className="text-emerald-500" />
            <span>Salaries Only (فقط معاشات)</span>
          </button>
          <button 
            className="ghost-btn flex items-center gap-1.5 py-2 px-3 text-xs font-bold border border-slate-200 dark:border-slate-700" 
            type="button" 
            onClick={() => onPrint('payments_only')} 
            title="Print record of all disbursed salary payments (How much paid)"
          >
            <CheckCircle2 size={14} className="text-indigo-500" />
            <span>How Much Paid (ورکړل شوي)</span>
          </button>
          <button 
            className="ghost-btn flex items-center gap-1.5 py-2 px-3 text-xs font-bold border border-slate-200 dark:border-slate-700" 
            type="button" 
            onClick={() => onPrint('unpaid_only')} 
            title="Print list of employees with outstanding/unpaid balances only"
          >
            <Clock3 size={14} className="text-amber-500" />
            <span>Unpaid Only (پاتې طلبات)</span>
          </button>
          <button 
            className="ghost-btn flex items-center gap-1.5 py-2 px-3 text-xs font-bold border border-slate-200 dark:border-slate-700" 
            type="button" 
            onClick={onExcel}
          >
            <FileSpreadsheet size={14} className="text-emerald-600" /> 
            <span>Export Excel</span>
          </button>
        </div>
      </div>

      <div className="salary-report-summary-grid">
        <SalaryMiniStat label={t('payroll.totalEmployees')} value={summary.total_employees} />
        <SalaryMiniStat label={t('payroll.totalPayable')} value={currency(summary.total_payable_salary ?? summary.total_monthly_salary)} />
        <SalaryMiniStat label={t('payroll.totalPaid')} value={currency(summary.total_paid_this_month)} tone="green" />
        <SalaryMiniStat label={t('payroll.totalRemaining')} value={currency(summary.total_remaining_salary)} tone="amber" />
        <SalaryMiniStat label={t('payroll.fullyPaid')} value={summary.fully_paid_employees} tone="green" />
        <SalaryMiniStat label={t('payroll.unpaid')} value={summary.unpaid_employees} tone="amber" />
      </div>
      <div className="salary-report-filters">
        <label className="salary-filter-search"><Search size={16} /><input value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Search employee name" /></label>
        <select className="salary-filter-company" value={filters.company_id || 'all'} onChange={(event) => setFilters({ ...filters, company_id: event.target.value })}>
          <option value="all">🏢 All Companies (All Employees)</option>
          <option value="bawar-star">🏬 Bawar Star Plastic Industry</option>
          <option value="sky-ariana">✈️ Sky Ariana Ltd</option>
        </select>
        <select className="salary-filter-dept" value={filters.department} onChange={(event) => setFilters({ ...filters, department: event.target.value })}><option value="">{t('payroll.allDepartments')}</option>{departments.map((department) => <option key={department} value={department}>{department}</option>)}</select>
        <select className="salary-filter-status" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="">{t('payroll.allStatus')}</option><option value="Paid">{t('payroll.paid')}</option><option value="Partial Paid">{t('payroll.partialPaid')}</option><option value="Unpaid">{t('payroll.unpaidStatus')}</option><option value="Advance">{t('payroll.advance')}</option></select>
        <select className="salary-filter-month" value={filters.month} onChange={(event) => setFilters({ ...filters, month: Number(event.target.value) })}>{monthNames.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}</select>
        <select className="salary-filter-year" value={filters.year} onChange={(event) => setFilters({ ...filters, year: Number(event.target.value) })}>{years.map((year) => <option key={year} value={year}>{year}</option>)}</select>
        <button className="ghost-btn salary-filter-refresh" type="button" onClick={onRefresh}>{loading ? 'Refreshing...' : 'Refresh'}</button>
      </div>
      {error && <div className="error-banner">{error}</div>}
      {/* Desktop Table View (Visible on Tablet & Desktop) */}
      <div className="salary-report-table-wrap hidden md:block">
        <table className="salary-report-table min-w-[900px]">
          <thead>
            <tr>
              <th className="col-sno">S.No</th>
              <th className="col-emp-id">{t('payroll.employeeId')}</th>
              <th className="col-emp-name">{t('payroll.employeeName')}</th>
              <th className="col-dept-pos">{t('payroll.departmentPosition')}</th>
              <th className="col-payable text-right">{t('payroll.totalPayable')}</th>
              <th className="col-paid text-right">{t('payroll.paidSalary')}</th>
              <th className="col-remaining text-right">{t('payroll.carryForward')}</th>
              <th className="col-status text-center">{t('payroll.paymentStatus')}</th>
              <th className="col-last-date text-center">{t('payroll.lastPaymentDate')}</th>
              <th className="col-actions text-right">{t('payroll.action')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.employee_id}>
                <td className="col-sno">{index + 1}</td>
                <td className="col-emp-id"><span className="mono-text">{row.employee_code}</span></td>
                <td className="col-emp-name" title={unescapeText(row.employee_name)}><strong>{unescapeText(row.employee_name)}</strong></td>
                <td className="col-dept-pos" title={`${unescapeText(row.department) || '-'} / ${unescapeText(row.position) || '-'}`}>
                  {unescapeText(row.department) || '-'} / {unescapeText(row.position) || '-'}
                </td>
                <td className="col-payable mono-text text-right">{currency(row.total_payable_salary ?? row.monthly_salary)}</td>
                <td className="col-paid salary-paid mono-text text-right">{currency(row.paid_salary)}</td>
                <td className="col-remaining salary-remaining mono-text text-right">{currency(row.remaining_salary)}</td>
                <td className="col-status text-center"><span className={`salary-status-badge ${row.payment_status.toLowerCase().replaceAll(' ', '-')}`}>{row.payment_status}</span></td>
                <td className="col-last-date text-center">{row.last_payment_date ? dateLabel(row.last_payment_date) : '-'}</td>
                <td className="col-actions text-right">
                  <div className="salary-row-actions">
                    <button className="primary-btn salary-pay-btn" type="button" onClick={() => onPay(row)} title={t('payroll.paySalary')}>
                      <Banknote size={14} />
                      <span>{t('payroll.paySalary')}</span>
                    </button>
                    {onEditEmployee && (
                      <button className="action-icon-btn" type="button" onClick={() => onEditEmployee(row)} title={t('payroll.edit')}>
                        <Edit size={15} />
                      </button>
                    )}
                    {onEditSalary && (
                      <button className="action-icon-btn" type="button" onClick={() => onEditSalary(row)} title={t('payroll.editSalary')}>
                        <CircleDollarSign size={15} />
                      </button>
                    )}
                    {onDeleteEmployee && (
                      <button 
                        className="action-icon-btn action-icon-btn--danger" 
                        type="button" 
                        disabled={deletingEmployeeId === Number(row.employee_id)} 
                        onClick={() => onDeleteEmployee(row)}
                        title={t('payroll.delete')}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan="10"><EmptyState title="No salary report rows" body="Try changing the search, department, status, month, or year filter." action="Refresh" onAction={onRefresh} /></td></tr>}
          </tbody>
        </table>
      </div>
      {/* Mobile Card View (Visible on Mobile Screens) */}
      <div className="block md:hidden salary-report-mobile-list flex flex-col gap-3.5 mt-4">
        {rows.map((row, index) => {
          const empName = unescapeText(row.employee_name);
          const initials = empName ? empName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'EM';
          const avatarUrl = resolveAvatarUrl(row.avatar_url);
          const paymentStatus = row.payment_status || 'Unpaid';
          const isPaid = paymentStatus === 'Paid';
          const isPartial = paymentStatus === 'Partial Paid';
          const isAdvance = paymentStatus === 'Advance';

          const glowClass = isPaid
            ? 'ring-2 ring-emerald-500/70 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
            : isPartial
            ? 'ring-2 ring-amber-500/70 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
            : isAdvance
            ? 'ring-2 ring-indigo-500/70 shadow-[0_0_12px_rgba(99,102,241,0.4)]'
            : 'ring-2 ring-rose-500/70 shadow-[0_0_12px_rgba(244,63,94,0.4)]';

          const remainingNum = Number(row.remaining_salary || 0);
          const remainingTone = remainingNum < 0
            ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-500/30'
            : remainingNum > 0
            ? 'text-amber-600 dark:text-amber-400 bg-amber-50/80 dark:bg-amber-950/40 border-amber-500/30'
            : 'text-slate-500 dark:text-slate-400 bg-slate-100/60 dark:bg-slate-800/40 border-slate-200/50';

          return (
            <div key={row.employee_id} className="mobile-employee-card p-4 rounded-2xl bg-white/85 dark:bg-slate-850/85 backdrop-blur-xl border border-slate-200/80 dark:border-slate-700/80 shadow-md flex flex-col gap-3.5 transition-all">
              {/* Top Row: Avatar with status glow ring, Name & Code, Status Badge Pill */}
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="relative shrink-0">
                    <div className={`w-11 h-11 rounded-full bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 text-white font-black text-xs flex items-center justify-center overflow-hidden border-2 border-white/60 dark:border-slate-800 transition-all ${glowClass}`}>
                      {avatarUrl ? (
                        <img src={avatarUrl} alt={empName} className="w-full h-full object-cover" />
                      ) : (
                        <span>{initials}</span>
                      )}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-slate-900 dark:bg-slate-700 text-white font-extrabold text-[9px] flex items-center justify-center border border-white dark:border-slate-800 shadow-xs">
                      {index + 1}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white truncate tracking-tight">
                      {empName}
                    </h4>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span className="text-[10px] font-mono font-black px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/90 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-600/50">
                        {row.employee_code || `EMP-${row.employee_id}`}
                      </span>
                      {row.last_payment_date && (
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate flex items-center gap-1">
                          <span>&bull;</span>
                          <span>{dateLabel(row.last_payment_date)}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <span className={`salary-status-badge ${paymentStatus.toLowerCase().replaceAll(' ', '-')} shrink-0 self-start text-[11px] font-black px-2.5 py-1 rounded-full shadow-xs`}>
                  {paymentStatus}
                </span>
              </div>

              {/* Department & Position Tags */}
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 flex-wrap bg-slate-50/80 dark:bg-slate-900/50 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800">
                <span className="font-semibold text-slate-700 dark:text-slate-300">{unescapeText(row.department) || 'General Dept'}</span>
                <span>&bull;</span>
                <span className="text-slate-600 dark:text-slate-400">{unescapeText(row.position) || 'Employee'}</span>
              </div>

              {/* Financial Metrics Grid */}
              <div className="grid grid-cols-3 gap-2 p-2 rounded-xl bg-slate-50/90 dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-800/90 text-center">
                <div className="p-1.5 rounded-lg bg-white/70 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50">
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">{t('payroll.totalPayable', 'Payable')}</span>
                  <strong className="text-xs font-mono font-black text-slate-900 dark:text-white block mt-0.5">
                    {currency(row.total_payable_salary ?? row.monthly_salary)}
                  </strong>
                </div>
                <div className="p-1.5 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-500/20">
                  <span className="text-[9px] font-extrabold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">{t('payroll.paidSalary', 'Paid')}</span>
                  <strong className="text-xs font-mono font-black text-emerald-600 dark:text-emerald-400 block mt-0.5">
                    {currency(row.paid_salary)}
                  </strong>
                </div>
                <div className={`p-1.5 rounded-lg border ${remainingTone}`}>
                  <span className="text-[9px] font-extrabold uppercase tracking-wider block opacity-85">{t('payroll.carryForward', 'Carry Fwd')}</span>
                  <strong className="text-xs font-mono font-black block mt-0.5">
                    {currency(row.remaining_salary)}
                  </strong>
                </div>
              </div>

              {/* Touch-Friendly Action Bar */}
              <div className="flex items-center gap-2 pt-0.5">
                <button
                  className="flex-1 min-h-[42px] py-2 px-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black rounded-xl shadow-md shadow-blue-500/20 flex items-center justify-center gap-1.5 active:scale-[0.97] transition-all cursor-pointer"
                  type="button"
                  onClick={() => onPay(row)}
                >
                  <Banknote size={16} />
                  <span>{t('payroll.paySalary', 'Pay Salary')}</span>
                </button>
                {onEditEmployee && (
                  <button
                    className="min-h-[42px] min-w-[42px] p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200/80 dark:border-slate-700 transition-all flex items-center justify-center active:scale-95 cursor-pointer"
                    type="button"
                    onClick={() => onEditEmployee(row)}
                    title={t('payroll.edit')}
                  >
                    <Edit size={16} className="text-indigo-500 dark:text-indigo-400" />
                  </button>
                )}
                {onEditSalary && (
                  <button
                    className="min-h-[42px] min-w-[42px] p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200/80 dark:border-slate-700 transition-all flex items-center justify-center active:scale-95 cursor-pointer"
                    type="button"
                    onClick={() => onEditSalary(row)}
                    title={t('payroll.editSalary')}
                  >
                    <CircleDollarSign size={16} className="text-blue-500 dark:text-blue-400" />
                  </button>
                )}
                {onDeleteEmployee && (
                  <button
                    className="min-h-[42px] min-w-[42px] p-2 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-xl border border-rose-200/60 dark:border-rose-900/50 transition-all flex items-center justify-center active:scale-95 cursor-pointer disabled:opacity-50"
                    type="button"
                    disabled={deletingEmployeeId === Number(row.employee_id)}
                    onClick={() => onDeleteEmployee(row)}
                    title={t('payroll.delete')}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>     
      {!rows.length && (
          <EmptyState
            title="No salary report rows"
            body="Try changing the search, department, status, month, or year filter."
            action="Refresh"
            onAction={onRefresh}
          />
        )}
      <SalaryChangeHistoryReport changes={salaryChanges} companyName={companyName} companyLogo={companyLogo} />
    </article>
  );
}

function salaryPaymentInputValue(value) {
  if (!Number.isFinite(value)) return '';
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

function SalaryPaymentModal({ row, month, year, onClose, onSave }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({ amount: '', payment_date: new Date().toISOString().slice(0, 10), payment_method: 'cash', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const currentCarryForward = Number(row.remaining_salary || 0);
  const payableLimit = Math.max(0, currentCarryForward);
  const amount = Number(form.amount || 0);

  function updateAmount(rawValue) {
    setError('');
    if (rawValue === '') {
      setForm({ ...form, amount: '' });
      return;
    }

    const nextAmount = Number(rawValue);
    if (!Number.isFinite(nextAmount)) return;
    if (nextAmount < 0) {
      setForm({ ...form, amount: '0' });
      return;
    }

    if (nextAmount > payableLimit) {
      setForm({ ...form, amount: salaryPaymentInputValue(payableLimit) });
      setError('Amount cannot be more than remaining salary.');
      return;
    }

    setForm({ ...form, amount: rawValue });
  }

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (!amount) return setError('Amount cannot be empty.');
    if (amount <= 0) return setError('Amount must be greater than 0.');
    if (payableLimit <= 0) return setError('No remaining salary is available to pay.');
    if (amount > payableLimit) return setError('Amount cannot be more than remaining salary.');
    setSaving(true);
    try {
      await onSave({
        employee_id: row.employee_id,
        month,
        year,
        amount,
        payment_date: form.payment_date,
        payment_method: form.payment_method,
        notes: form.notes
      });
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  const closingCarryForward = Number((currentCarryForward - amount).toFixed(2));

  return (
    <BaseModal 
      isOpen={true} 
      onClose={onClose} 
      title={t('payroll.paySalary')} 
      maxWidth="680px"
      panelClass="salary-payment-modal"
      footer={
        <>
          <button 
            type="button" 
            className="ghost-btn modal-btn-cancel" 
            onClick={onClose} 
            disabled={saving}
          >
            {t('payroll.cancel')}
          </button>
          <button 
            type="submit" 
            form="salaryPaymentForm" 
            className="primary-btn modal-btn-save" 
            disabled={saving || payableLimit <= 0}
          >
            {saving ? 'Saving...' : 'Save Salary Payment'}
          </button>
        </>
      }
    >
      <form id="salaryPaymentForm" className="modal-form" onSubmit={submit}>
        <div className="salary-pay-grid">
          <ReadOnlyMetric label="Employee name" value={row.employee_name} />
          <ReadOnlyMetric label="Base monthly salary" value={currency(row.monthly_salary)} />
          <ReadOnlyMetric label="Previous carry forward" value={currency(row.previous_carry_forward_balance || 0)} tone={Number(row.previous_carry_forward_balance || 0) < 0 ? 'amber' : 'green'} />
          <ReadOnlyMetric label="Total payable salary" value={currency(row.total_payable_salary ?? row.monthly_salary)} />
          <ReadOnlyMetric label="Already paid amount" value={currency(row.paid_salary)} tone="green" />
          <ReadOnlyMetric label="Current carry forward" value={currency(currentCarryForward)} tone={currentCarryForward < 0 ? 'amber' : 'green'} />
          <ReadOnlyMetric label="After this payment" value={currency(closingCarryForward)} tone={closingCarryForward < 0 ? 'amber' : 'green'} />
        </div>

        <div className="salary-edit-grid">
          <label className="form-field">
            <div className="flex items-center justify-between mb-1">
              <span className="form-label">{t('payroll.amountToPay')} *</span>
              {payableLimit > 0 && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400 hover:bg-blue-500/25 transition-all"
                    onClick={() => updateAmount(salaryPaymentInputValue(payableLimit))}
                  >
                    100% (Full)
                  </button>
                  <button
                    type="button"
                    className="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 transition-all"
                    onClick={() => updateAmount(salaryPaymentInputValue(Math.round(payableLimit / 2)))}
                  >
                    50%
                  </button>
                  <button
                    type="button"
                    className="px-2 py-0.5 text-[10px] font-bold rounded-lg bg-slate-500/15 text-slate-600 dark:text-slate-400 hover:bg-slate-500/25 transition-all"
                    onClick={() => updateAmount('')}
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
            <input 
              className="form-control"
              type="number" 
              min="0" 
              max={payableLimit} 
              step="0.01" 
              value={form.amount} 
              onChange={(event) => updateAmount(event.target.value)} 
              placeholder="0.00" 
              autoFocus 
            />
          </label>

          <label className="form-field">
            <span className="form-label">{t('payroll.paymentDate')} *</span>
            <input 
              className="form-control"
              type="date" 
              value={form.payment_date} 
              onChange={(event) => setForm({ ...form, payment_date: event.target.value })} 
              required 
            />
          </label>

          <label className="form-field">
            <span className="form-label">{t('payroll.paymentMethod')} *</span>
            <select 
              className="form-select"
              value={form.payment_method} 
              onChange={(event) => setForm({ ...event, payment_method: event.target.value })}
            >
              <option value="cash">{t('payroll.cash')}</option>
              <option value="bank">{t('payroll.bank')}</option>
              <option value="hawala">{t('payroll.hawala')}</option>
              <option value="other">{t('payroll.other')}</option>
            </select>
          </label>

          <label className="form-field form-field--full">
            <span className="form-label">{t('payroll.notes')}</span>
            <textarea 
              className="form-textarea"
              value={form.notes} 
              onChange={(event) => setForm({ ...form, notes: event.target.value })} 
              placeholder={`Salary payment for ${getMonthName(month)} ${year}`} 
              rows={2}
            />
          </label>
        </div>

        {amount > 0 && closingCarryForward > 0 && (
          <div className="salary-overpayment-warning">
            <Clock3 size={18} />
            <span>{currency(closingCarryForward)} will remain as arrears for next month.</span>
          </div>
        )}

        {error && <div className="error-banner">{error}</div>}
      </form>
    </BaseModal>
  );
}

function SalaryDiffPreview({ oldSalary, oldCurrency, newSalary, newCurrency }) {
  const { t } = useTranslation();
  const oldVal = Number(oldSalary || 0);
  const newVal = Number(newSalary || 0);
  const diff = newVal - oldVal;

  if (oldCurrency !== newCurrency) {
    return (
      <div className="salary-diff-preview">
        <div className="salary-diff-item">
          <span>{t('payroll.previousSalary')}</span>
          <strong>{currency(oldVal, oldCurrency)}</strong>
        </div>
        <div className="salary-diff-item">
          <span>{t('payroll.newSalary')}</span>
          <strong>{currency(newVal, newCurrency)}</strong>
        </div>
        <div className="salary-diff-item">
          <span>{t('payroll.currency')}</span>
          <strong>{oldCurrency} → {newCurrency}</strong>
        </div>
      </div>
    );
  }

  const isIncrease = diff > 0;
  const isDecrease = diff < 0;
  const diffFormatted = `${isIncrease ? '+' : ''}${currency(diff, newCurrency)}`;

  return (
    <div className="salary-diff-preview">
      <div className="salary-diff-item">
        <span>{t('payroll.previousSalary')}</span>
        <strong>{currency(oldVal, oldCurrency)}</strong>
      </div>
      <div className="salary-diff-item">
        <span>{t('payroll.newSalary')}</span>
        <strong>{currency(newVal, newCurrency)}</strong>
      </div>
      <div className={`salary-diff-item ${isIncrease ? 'diff-positive' : isDecrease ? 'diff-negative' : 'diff-neutral'}`}>
        <span>{t('payroll.difference')}</span>
        <strong>{diffFormatted}</strong>
      </div>
    </div>
  );
}

function EditEmployeeSalaryModal({ row, currentUser, onClose, onSave }) {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    new_salary: '',
    new_currency: row.currency || 'AFN',
    effective_date: new Date().toISOString().slice(0, 10),
    reason: '',
    notes: ''
  });
  const [history, setHistory] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getEmployeeSalaryHistory(row.employee_id).then(setHistory).catch(() => setHistory([]));
  }, [row.employee_id]);

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (form.new_salary === '') return setError('New salary cannot be empty.');
    if (Number(form.new_salary) < 0) return setError('Salary cannot be negative.');
    if (!form.effective_date) return setError('Effective date is required.');
    if (!form.reason.trim()) return setError('Reason for salary change is required.');
    const confirmed = window.confirm('Are you sure you want to change this employee salary? Old records will stay unchanged. New salary will apply from selected effective date.');
    if (!confirmed) return;
    setSaving(true);
    try {
      await onSave(row.employee_id, { ...form, new_salary: Number(form.new_salary) });
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <BaseModal 
      isOpen={true} 
      onClose={onClose} 
      title={t('payroll.editSalary')} 
      maxWidth="700px"
      panelClass="salary-edit-modal"
      footer={
        <>
          <button 
            type="button" 
            className="ghost-btn modal-btn-cancel" 
            onClick={onClose} 
            disabled={saving}
          >
            {t('payroll.cancel')}
          </button>
          <button 
            type="submit" 
            form="editSalaryForm" 
            className="primary-btn modal-btn-save" 
            disabled={saving}
          >
            {saving ? 'Saving Salary Change...' : 'Save Salary Change'}
          </button>
        </>
      }
    >
      <form id="editSalaryForm" className="modal-form" onSubmit={submit}>
        {/* Compact Single Summary Card */}
        <div className="salary-current-summary">
          <div>
            <h4 className="salary-summary-name">{row.employee_name}</h4>
            <span className="salary-summary-id">{row.employee_code || `EMP-${row.employee_id}`}</span>
          </div>
          <div className="salary-summary-amount">
            <span className="salary-summary-label">{t('payroll.currentSalary')}</span>
            <strong className="salary-summary-val">{currency(row.monthly_salary, row.currency)}</strong>
          </div>
        </div>

        <div className="salary-edit-grid">
          <label className="form-field">
            <span className="form-label">{t('payroll.newSalary')} *</span>
            <input 
              className="form-control"
              type="number" 
              min="0" 
              step="0.01" 
              value={form.new_salary} 
              onChange={(e) => setForm({ ...form, new_salary: e.target.value })} 
              placeholder="0.00" 
              required 
              autoFocus 
            />
          </label>

          <label className="form-field">
            <span className="form-label">{t('payroll.newCurrency')} *</span>
            <select 
              className="form-select"
              value={form.new_currency} 
              onChange={(e) => setForm({ ...form, new_currency: e.target.value })}
            >
              <option value="AFN">{t('payroll.afn')}</option>
              <option value="USD">{t('payroll.usd')}</option>
            </select>
          </label>

          <label className="form-field">
            <span className="form-label">{t('payroll.effectiveDate')} *</span>
            <input 
              className="form-control"
              type="date" 
              value={form.effective_date} 
              onChange={(e) => setForm({ ...form, effective_date: e.target.value })} 
              required 
            />
          </label>

          <label className="form-field">
            <span className="form-label">{t('payroll.reasonForChange')} *</span>
            <input 
              className="form-control"
              value={form.reason} 
              onChange={(e) => setForm({ ...form, reason: e.target.value })} 
              placeholder="e.g. Promotion, annual review..." 
              required 
            />
          </label>

          <label className="form-field form-field--full">
            <span className="form-label">{t('payroll.changedBy')}</span>
            <input 
              className="form-control"
              value={`${currentUser?.full_name || 'Administrator'} (${currentUser?.role || 'Administrator'})`} 
              readOnly 
              disabled 
            />
          </label>

          <label className="form-field form-field--full">
            <span className="form-label">{t('payroll.notes')}</span>
            <textarea 
              className="form-textarea"
              value={form.notes} 
              onChange={(e) => setForm({ ...form, notes: e.target.value })} 
              placeholder="Optional salary change notes" 
              rows={2}
            />
          </label>
        </div>

        {/* Salary Comparison Preview */}
        {form.new_salary !== '' && Number(form.new_salary) >= 0 && (
          <SalaryDiffPreview 
            oldSalary={row.monthly_salary} 
            oldCurrency={row.currency} 
            newSalary={form.new_salary} 
            newCurrency={form.new_currency} 
          />
        )}

        {error && <div className="error-banner">{error}</div>}

        <div className="salary-history-section">
          <h4 className="salary-history-title">{t('payroll.salaryHistory')}</h4>
          {history.length ? (
            <div className="salary-history-list">
              {history.map((change) => (
                <div className="salary-history-item" key={change.id}>
                  <div>
                    <strong>{currency(change.old_salary, change.old_currency)} → {currency(change.new_salary, change.new_currency)}</strong>
                    <span>{t('payroll.reason')}{change.reason}</span>
                  </div>
                  <div>
                    <span>{t('payroll.effective')}{dateLabel(change.effective_date)}</span>
                    <span>By: {change.changed_by}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="salary-muted">{t('payroll.noPreviousChanges')}</p>
          )}
        </div>
      </form>
    </BaseModal>
  );
}

function SalaryChangeHistoryReport({ changes = [], companyName, companyLogo }) {
  const { t } = useTranslation();
  function download(format) {
    const rows = changes.map((change) => ({
      employee_name: change.employee_name,
      employee_id: change.employee_code,
      old_salary: change.old_salary,
      new_salary: change.new_salary,
      currency: change.new_currency,
      effective_date: change.effective_date,
      changed_by: change.changed_by,
      reason: change.reason,
      notes: change.notes
    }));
    const content = format === 'json'
      ? JSON.stringify(rows, null, 2)
      : [['Employee Name', 'Employee ID', 'Old Salary', 'New Salary', 'Currency', 'Effective Date', 'Changed By', 'Reason', 'Notes'], ...rows.map(Object.values)].map((line) => line.map(csvCell).join(',')).join('\n');
    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `salary-change-history.${format === 'excel' ? 'xls' : format}`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function printHistory() {
    const body = changes.map((change) =>
      '<tr><td>' + escapeHtml(change.employee_name) +
      '</td><td>' + escapeHtml(currency(change.old_salary, change.old_currency)) +
      '</td><td>' + escapeHtml(currency(change.new_salary, change.new_currency)) +
      '</td><td>' + escapeHtml(change.effective_date) +
      '</td><td>' + escapeHtml(change.changed_by) +
      '</td><td>' + escapeHtml(change.reason) + '</td></tr>'
    ).join('');
    const printWindow = window.open('', '_blank', 'width=1100,height=800');
    if (!printWindow) return;
    printWindow.document.write(
      '<!doctype html><html><head><title>Salary Change History</title>' +
      '<style>@page{size:A4 portrait;margin:10mm}body{font-family:Arial;color:#111827}.header{display:flex;justify-content:space-between;border-bottom:2px solid #2563eb;padding-bottom:12px}.logo{max-height:48px}table{width:100%;border-collapse:collapse;margin-top:18px;font-size:11px}th,td{border:1px solid #cbd5e1;padding:6px;text-align:left}th{background:#eaf2ff;color:#1d4ed8}.signatures{display:grid;grid-template-columns:repeat(3,1fr);gap:28px;margin-top:70px}.signatures div{border-top:1px solid #111;padding-top:8px;text-align:center}</style></head>' +
      '<body><div class="header"><div>' +
      (companyLogo ? ('<img class="logo" src="' + escapeHtml(companyLogo) + '"/>') : '') +
      '<h2>' + escapeHtml(companyName) + '</h2>' +
      '<strong>Salary Change History</strong></div><span>Generated: ' + new Date().toLocaleString() + '</span></div>' +
      '<table><thead><tr><th>Employee Name</th><th>Old Salary</th><th>New Salary</th><th>Effective Date</th><th>Changed By</th><th>Reason</th></tr></thead>' +
      '<tbody>' + body + '</tbody></table>' +
      '<div class="signatures"><div>Employee Signature</div><div>Accountant Signature</div><div>Manager Signature</div></div></body></html>'
    );
    printWindow.document.close();
    printWindow.print();
  }

  return <section className="salary-change-report"><div className="salary-panel-heading"><div><p className="eyebrow">{t('payroll.auditReport')}</p><h3>{t('payroll.salaryChangeHistory')}</h3></div><div className="salary-report-actions"><button className="ghost-btn" type="button" onClick={printHistory}><Printer size={17} /> Print / PDF</button><button className="ghost-btn" type="button" onClick={() => download('csv')}>{t('payroll.csv')}</button><button className="ghost-btn" type="button" onClick={() => download('json')}>{t('payroll.json')}</button><button className="ghost-btn" type="button" onClick={() => download('excel')}>{t('payroll.excel')}</button></div></div><div className="salary-report-table-wrap"><table className="salary-report-table salary-change-table"><thead><tr><th>{t('payroll.employeeName')}</th><th>{t('payroll.oldSalary')}</th><th>{t('payroll.newSalary')}</th><th>{t('payroll.effectiveDate')}</th><th>{t('payroll.changedBy')}</th><th>{t('payroll.reasonLabel')}</th></tr></thead><tbody>{changes.map((change) => <tr key={change.id}><td>{change.employee_name}</td><td>{currency(change.old_salary, change.old_currency)}</td><td>{currency(change.new_salary, change.new_currency)}</td><td>{dateLabel(change.effective_date)}</td><td>{change.changed_by}</td><td>{change.reason}</td></tr>)}{!changes.length && <tr><td colSpan="6">{t('payroll.noSalaryChanges')}</td></tr>}</tbody></table></div></section>;
}

function SalaryMiniStat({ label, value, tone = 'blue' }) {
  return <div className={`salary-mini-stat salary-mini-stat-${tone}`}><span>{label}</span><strong>{value}</strong></div>;
}

function ReadOnlyMetric({ label, value, tone = '' }) {
  return <div className={`salary-readonly ${tone}`}><span>{label}</span><strong>{value}</strong></div>;
}

function SalaryStat({ icon: Icon, label, value, tone }) {
  const sparklineData = [12, 19, 10, 24, 18, 30, 28];
  const max = Math.max(...sparklineData);
  const min = Math.min(...sparklineData);
  const points = sparklineData.map((val, index) => {
    const x = (index / (sparklineData.length - 1)) * 55;
    const y = 17 - ((val - min) / (max - min)) * 14;
    return `${x},${y}`;
  }).join(' ');

  const delta = label.toLowerCase().includes('remaining') || label.toLowerCase().includes('carry') ? '↓ 1.2%' : '↑ 3.4%';
  const isNegative = label.toLowerCase().includes('remaining') || label.toLowerCase().includes('carry');

  return (
    <article className={`salary-metric-card salary-metric-card-${tone} relative overflow-hidden group hover:scale-[1.02] transition-transform duration-200`}>
      <div className="salary-stat-top-row flex justify-between items-start w-full">
        <span className="salary-stat-icon-wrapper flex items-center justify-center p-2.5 rounded-xl bg-white/20 dark:bg-zinc-800/80 shadow-sm"><Icon size={20} /></span>
        <span className={`salary-stat-delta-pill text-[10px] font-bold px-2 py-0.5 rounded-full ${isNegative ? 'bg-amber-500/20 text-amber-500' : 'bg-emerald-500/20 text-emerald-500'}`}>
          {delta}
        </span>
      </div>
      <div className="salary-stat-body mt-4">
        <p className="salary-stat-label text-xs text-slate-400 font-medium">{label}</p>
        <strong className="salary-metric-value text-2xl font-bold tracking-tight block mt-1 font-mono">{value}</strong>
      </div>
      <div className="salary-stat-sparkline absolute bottom-2 right-2 w-16 h-6 opacity-60 pointer-events-none">
        <svg viewBox="0 0 60 20" className="sparkline-svg w-full h-full">
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            points={points}
            className={isNegative ? 'text-amber-500' : 'text-emerald-500'}
          />
        </svg>
      </div>
    </article>
  );
}

function EmployeeAvatar({ employee, onChangeAvatar, uploading }) {
  const [imgError, setImgError] = useState(false);
  const initials = String(employee.full_name || 'E').slice(0, 2).toUpperCase();
  const rawUrl = employee.avatar_url || employee.avatarUrl || employee.photo || '';
  const avatarUrl = resolveAvatarUrl(rawUrl);

  useEffect(() => {
    setImgError(false);
  }, [rawUrl]);

  const content = avatarUrl && !imgError
    ? <img src={avatarUrl} alt={`${employee.full_name} profile`} onError={() => setImgError(true)} />
    : <span>{initials}</span>;

  if (!onChangeAvatar) {
    return <span className="salary-avatar">{content}</span>;
  }

  return (
    <label className={`salary-avatar salary-avatar-upload ${uploading ? 'uploading' : ''}`} title="Change employee picture">
      {content}
      <input
        type="file"
        accept="image/*"
        disabled={uploading}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onChangeAvatar(employee, file);
          event.target.value = '';
        }}
      />
      <span className="salary-avatar-overlay"><Camera size={14} /></span>
    </label>
  );
}

function EmployeeCardRow({
  employee,
  row,
  onPay,
  onOpenLedger,
  onEditEmployee,
  onEditSalary,
  onDeleteEmployee,
  onChangeAvatar,
  deletingEmployeeId,
  uploadingAvatarId,
  navigate
}) {
  const { t } = useTranslation();
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

  const [menuOpen, setMenuOpen] = useState(false);
  const hasJoiningDate = Boolean(employee.joining_date);

  const getCompanyBadge = () => {
    const companyId = employee.company_id || 'all';
    if (companyId === 'bawar-star') {
      return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25">{t('payroll.bawarStarPlastic')}</span>;
    }
    if (companyId === 'sky-ariana') {
      return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/25">{t('payroll.skyArianaLtd')}</span>;
    }
    return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/25">{t('payroll.allCompaniesShared')}</span>;
  };

  const getStatusBadge = () => {
    const status = row.payment_status;
    if (status === 'Paid') return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">{t('payroll.fullyPaidBadge')}</span>;
    if (status === 'Partial Paid') return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25">{t('payroll.partiallyPaidBadge')}</span>;
    if (status === 'Advance') return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/25">{t('payroll.overpaidAdvanceBadge')}</span>;
    return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25">{t('payroll.unpaidBadge')}</span>;
  };

  const handleNavigateLedger = () => {
    if (navigate) {
      navigate(`/employees/${employee.id}/ledger`);
    } else if (onOpenLedger) {
      onOpenLedger(employee);
    }
  };

  const cleanFullName = unescapeText(employee.full_name);
  const cleanPosition = unescapeText(employee.position || 'Employee');
  const cleanDept = unescapeText(employee.department || '');

  return (
    <div className="salary-employee-row glass-card p-4 rounded-2xl mb-3 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 transition-all w-full overflow-hidden" key={employee.id}>
      <div className="flex items-start gap-3.5 min-w-0 w-full lg:w-auto flex-1">
        <EmployeeAvatar employee={employee} onChangeAvatar={onChangeAvatar} uploading={uploadingAvatarId === Number(employee.id)} />
        
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h4 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight leading-snug break-words">
              {cleanFullName}
            </h4>
            {getCompanyBadge()}
            {hasJoiningDate ? (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" title={`Carry forward since ${employee.joining_date}`}>
                {t('payroll.carryForwardEnabled')}
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20" title="Historical carry forward disabled">
                {t('payroll.joiningDateRequired')}
              </span>
            )}
            {getStatusBadge()}
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>{cleanPosition}</span>
            <span>&bull;</span>
            <span className="font-mono text-slate-700 dark:text-slate-300 font-bold">{employee.employee_code || `EMP-${employee.id}`}</span>
            {cleanDept && (
              <>
                <span>&bull;</span>
                <span>{cleanDept}</span>
              </>
            )}
            <span>&bull;</span>
            <span className="text-slate-700 dark:text-slate-300 font-semibold">{t('payroll.salaryPrefix')}{(employee.monthly_salary || row.monthly_salary || 0).toLocaleString()} {row.currency}</span>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-auto bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-indigo-500/10 border border-amber-500/25 rounded-2xl p-3.5 flex items-center justify-between gap-3 shrink-0 my-0.5 lg:my-0 lg:min-w-[230px]">
        <div>
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
            {hasJoiningDate ? t('payroll.outstandingSalary') : t('payroll.currentMonthRemaining')}
          </span>
          <strong className="text-lg sm:text-xl font-black font-mono tracking-tight text-amber-600 dark:text-amber-400 block">
            {row.remaining_salary.toLocaleString()} {row.currency}
          </strong>
        </div>
        <div className="text-right">
          <small className="text-[10px] text-slate-500 dark:text-slate-400 font-medium block leading-tight">
            {hasJoiningDate ? `${dateLabel(employee.joining_date)}` : "No joining date"}
          </small>
          {hasJoiningDate && (
            <span className="text-[9.5px] text-indigo-600 dark:text-indigo-400 font-mono font-bold block mt-0.5">
              {jalaliDateLabel(employee.joining_date)}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 w-full lg:w-auto shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
        {onPay && (
          <button 
            className="flex-1 lg:flex-initial min-h-[42px] px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-1.5 active:scale-95 whitespace-nowrap" 
            type="button" 
            onClick={() => onPay(row)}
          >
            <Banknote size={15} />
            <span>{t('payroll.paySalary')}</span>
          </button>
        )}

        <button
          className="flex-1 lg:flex-initial min-h-[42px] px-3 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 transition-all flex items-center justify-center gap-1.5 active:scale-95 whitespace-nowrap"
          type="button"
          onClick={handleNavigateLedger}
          title="View Employee Salary Ledger"
        >
          <BookOpenText size={15} className="text-blue-500" />
          <span>{t('payroll.ledger')}</span>
        </button>

        {onEditEmployee && (
          <button 
            className="min-h-[42px] px-3 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 transition-all flex items-center justify-center gap-1.5 active:scale-95 whitespace-nowrap" 
            type="button" 
            onClick={() => onEditEmployee(employee)}
          >
            <Edit size={15} className="text-indigo-500" />
            <span>{t('payroll.edit')}</span>
          </button>
        )}

        <div className="relative-action-menu relative">
          <button
            type="button"
            className="min-h-[42px] min-w-[42px] p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-700 transition-all flex items-center justify-center"
            onClick={() => setMenuOpen(!menuOpen)}
            title="More options"
          >
            <MoreVertical size={16} />
          </button>


          {menuOpen && (
            <div
              className="action-dropdown-popup absolute right-0 top-full mt-1.5 bg-slate-900/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-1.5 z-50 shadow-2xl min-w-[170px] flex flex-col gap-1"
              onMouseLeave={() => setMenuOpen(false)}
            >
              {onEditSalary && (
                <button
                  type="button"
                  onClick={() => { setMenuOpen(false); onEditSalary(row); }}
                  className="flex items-center gap-2 p-2 text-xs font-medium text-slate-200 hover:bg-slate-800 rounded-xl transition-all w-full text-left"
                >
                  <CircleDollarSign size={14} className="text-blue-400" /> {t('payroll.editSalary')}
                </button>
              )}
              <button
                type="button"
                onClick={() => { setMenuOpen(false); handleNavigateLedger(); }}
                className="flex items-center gap-2 p-2 text-xs font-medium text-slate-200 hover:bg-slate-800 rounded-xl transition-all w-full text-left"
              >
                <Clock3 size={14} className="text-indigo-400" /> {t('payroll.salaryHistory')}
              </button>
              <button
                type="button"
                onClick={() => { setMenuOpen(false); handleNavigateLedger(); }}
                className="flex items-center gap-2 p-2 text-xs font-medium text-slate-200 hover:bg-slate-800 rounded-xl transition-all w-full text-left"
              >
                <Printer size={14} className="text-emerald-400" /> {t('payroll.printLedger')}
              </button>
              {onDeleteEmployee && (
                <button
                  type="button"
                  disabled={deletingEmployeeId === Number(employee.id)}
                  onClick={() => { setMenuOpen(false); onDeleteEmployee({ ...row, id: employee.id, full_name: employee.full_name, employee_code: employee.employee_code }); }}
                  className="flex items-center gap-2 p-2 text-xs font-medium text-rose-400 hover:bg-rose-950/40 rounded-xl transition-all w-full text-left"
                >
                  <Trash2 size={14} /> {deletingEmployeeId === Number(employee.id) ? 'Deleting...' : t('payroll.deleteEmployee')}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EmployeeList({ employees, transactions, reportRows = [], expanded = false, onPay, onOpenLedger, onEditSalary, onEditEmployee, onAddEmployee, onDeleteEmployee, onChangeAvatar, deletingEmployeeId, uploadingAvatarId }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState('all');
  const rowByEmployee = new Map((reportRows || []).map((row) => [Number(row.employee_id), row]));

  const filteredEmployees = useMemo(() => {
    if (selectedCompanyFilter === 'all') return employees;
    return employees.filter((emp) => {
      const empComp = emp.company_id || 'all';
      return empComp === 'all' || empComp === selectedCompanyFilter;
    });
  }, [employees, selectedCompanyFilter]);

  const bawarCount = employees.filter((e) => (e.company_id || 'all') === 'bawar-star' || (e.company_id || 'all') === 'all').length;
  const skyCount = employees.filter((e) => (e.company_id || 'all') === 'sky-ariana' || (e.company_id || 'all') === 'all').length;

  return (
    <article className={`glass-card salary-panel ${expanded ? 'salary-panel-wide' : ''}`}>
      <div className="salary-panel-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div><p className="eyebrow">{t('payroll.employeeDirectory')}</p><h3>{t('payroll.salaryBalances')}</h3></div>
        {onAddEmployee && <button className="primary-btn" type="button" onClick={onAddEmployee} style={{ padding: '8px 16px', fontSize: '0.9rem' }}>{t('payroll.addEmployee')}</button>}
      </div>

      {/* Company Filter Tabs / Pills */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 my-3">
        <button
          type="button"
          onClick={() => setSelectedCompanyFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            selectedCompanyFilter === 'all' ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          🌐 {t('payroll.allCompanies')} ({employees.length})
        </button>
        <button
          type="button"
          onClick={() => setSelectedCompanyFilter('bawar-star')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            selectedCompanyFilter === 'bawar-star' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          🏬 {t('payroll.bawarStarPlastic')} ({bawarCount})
        </button>
        <button
          type="button"
          onClick={() => setSelectedCompanyFilter('sky-ariana')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            selectedCompanyFilter === 'sky-ariana' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          ✈️ {t('payroll.skyArianaLtd')} ({skyCount})
        </button>
      </div>

      {filteredEmployees.length ? (
        <div className="salary-employee-list">
          {filteredEmployees.map((employee) => {
            const fallback = employeeSalarySnapshot(employee, transactions);
            const row = rowByEmployee.get(Number(employee.id)) || {
              employee_id: employee.id,
              employee_name: employee.full_name,
              employee_code: employee.employee_code,
              department: employee.department,
              position: employee.position,
              monthly_salary: fallback.monthly_salary,
              previous_carry_forward_balance: fallback.previous_carry_forward_balance,
              total_payable_salary: fallback.total_payable_salary,
              paid_salary: fallback.paid_amount,
              remaining_salary: fallback.remaining_salary,
              carry_forward_balance: fallback.carry_forward_balance,
              payment_status: fallback.remaining_salary < 0 ? 'Advance' : fallback.remaining_salary === 0 ? 'Paid' : fallback.paid_amount > 0 ? 'Partial Paid' : 'Unpaid',
              currency: fallback.currency
            };
            return (
              <EmployeeCardRow
                key={employee.id}
                employee={employee}
                row={row}
                onPay={onPay}
                onOpenLedger={onOpenLedger}
                onEditEmployee={onEditEmployee}
                onEditSalary={onEditSalary}
                onDeleteEmployee={onDeleteEmployee}
                onChangeAvatar={onChangeAvatar}
                deletingEmployeeId={deletingEmployeeId}
                uploadingAvatarId={uploadingAvatarId}
                navigate={navigate}
              />
            );
          })}
        </div>
      ) : (
        <EmptyState title="No employees found" body="Add an employee with a monthly salary to begin." action="Add Employee" onAction={onAddEmployee || (() => {})} />
      )}
    </article>
  );
}
function EmptyState({ title, body, action, onAction }) {
  return <div className="salary-empty-state"><UsersRound size={32} /><h3>{title}</h3><p>{body}</p><button className="primary-btn" type="button" onClick={onAction}>{action}</button></div>;
}
function salaryReportHtml({ rows, summary, filters, companyName, companyLogo }) {
  const generated = new Date().toLocaleString();
  const reportMonth = `${getMonthName(filters.month)} ${filters.year}`;
  const tableRows = rows.map((row, index) => {
    const statusClass = row.payment_status === 'Paid' ? 'status-paid' : row.payment_status === 'Partial Paid' ? 'status-partial' : row.payment_status === 'Advance' ? 'status-advance' : 'status-unpaid';
    return '<tr>' +
      '<td class="index">' + (index + 1) + '</td>' +
      '<td class="code">' + escapeHtml(row.employee_code) + '</td>' +
      '<td class="name">' + escapeHtml(row.employee_name) + '</td>' +
      '<td>' + escapeHtml(row.department || '-') + ' / ' + escapeHtml(row.position || '-') + '</td>' +
      '<td class="money">' + escapeHtml(currency(row.total_payable_salary ?? row.monthly_salary)) + '</td>' +
      '<td class="money paid-money">' + escapeHtml(currency(row.paid_salary)) + '</td>' +
      '<td class="money due-money">' + escapeHtml(currency(row.remaining_salary)) + '</td>' +
      '<td style="text-align: center;"><span class="status-badge ' + statusClass + '">' + escapeHtml(row.payment_status) + '</span></td>' +
      '<td style="text-align: center; color: #4b5563; font-family: monospace;">' + escapeHtml(row.last_payment_date || '-') + '</td>' +
      '</tr>';
  }).join('');

  const initials = (companyName || 'SKY').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'SKY';

  const logoHtml = companyLogo
    ? ('<img class="logo" src="' + escapeHtml(companyLogo) + '" id="report-logo" />')
    : ('<div class="logo logo-placeholder"><span>' + escapeHtml(initials) + '</span></div>');

  const stylesheet = `
    /* ===== BASE STYLES (screen + print) ===== */
    *, *::before, *::after { box-sizing: border-box; }

    body {
      margin: 0;
      padding: 0;
      background-color: #f3f4f6;
      color: #1f2937;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    .print-container {
      background-color: #ffffff;
      margin: 0 auto;
      width: 297mm;
      min-height: 210mm;
      padding: 12mm 15mm;
      box-sizing: border-box;
      position: relative;
    }

    .document-frame {
      display: flex;
      flex-direction: column;
      height: 100%;
      justify-content: space-between;
    }

    /* ===== HEADER STYLES ===== */
    .report-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2.5px solid #2563eb;
      padding-bottom: 12px;
      margin-bottom: 14px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .logo {
      height: 52px;
      width: 52px;
      object-fit: contain;
      border-radius: 6px;
      background: #f8fafc;
      padding: 2px;
      border: 1px solid #e2e8f0;
    }

    .logo-placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #3b82f6, #1d4ed8);
      color: #ffffff;
      font-weight: bold;
      font-size: 16px;
      letter-spacing: 0.05em;
    }

    .report-title h2 {
      margin: 0;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.15em;
      color: #3b82f6;
      font-weight: 700;
    }

    .report-title h1 {
      margin: 2px 0 0 0;
      font-size: 17px;
      font-weight: 800;
      color: #111827;
      letter-spacing: -0.02em;
    }

    .report-title .subtitle {
      margin-top: 1px;
      font-size: 10.5px;
      color: #4b5563;
      font-weight: 500;
    }

    .report-meta {
      text-align: right;
      font-size: 10px;
      color: #374151;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .report-meta strong {
      font-size: 11px;
      color: #111827;
    }

    /* ===== SUMMARY SECTION ===== */
    .section-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: #374151;
      margin: 0 0 8px 0;
      border-left: 3px solid #3b82f6;
      padding-left: 8px;
    }

    .summary-metrics {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 10px;
      margin-bottom: 15px;
    }

    .metric-box {
      background-color: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      padding: 8px 10px;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }

    .metric-box-green {
      background-color: #f0fdf4;
      border-color: #bbf7d0;
    }

    .metric-box-amber {
      background-color: #fffbeb;
      border-color: #fde68a;
    }

    .metric-label {
      font-size: 9px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #4b5563;
    }

    .metric-box-green .metric-label {
      color: #166534;
    }

    .metric-box-amber .metric-label {
      color: #92400e;
    }

    .metric-value {
      font-size: 13.5px;
      font-weight: 800;
      color: #111827;
      font-family: SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
    }

    .metric-box-green .metric-value {
      color: #15803d;
    }

    .metric-box-amber .metric-value {
      color: #b45309;
    }

    /* ===== TABLE STYLES ===== */
    .table-section {
      margin-bottom: 15px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9.5px;
      text-align: left;
    }

    th {
      background-color: #0f172a;
      color: #ffffff;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.02em;
      padding: 4px 6px;
      border: 1px solid #334155;
      font-size: 8.5px;
      white-space: nowrap;
      vertical-align: middle;
    }

    td {
      padding: 4px 6px;
      border: 1px solid #e2e8f0;
      vertical-align: middle;
      font-size: 8.5px;
    }

    tbody tr {
      background-color: #ffffff;
    }

    tbody tr:nth-child(even) {
      background-color: #f9fafb;
    }

    .index {
      text-align: center;
      font-weight: 600;
      color: #6b7280;
    }

    .code {
      font-family: SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
      font-weight: 600;
      color: #4b5563;
    }

    .name {
      font-weight: 700;
      color: #111827;
    }

    .money {
      text-align: right;
      font-family: SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace;
      font-weight: 600;
    }

    .paid-money {
      color: #166534;
      font-weight: 700;
    }

    .due-money {
      color: #b45309;
      font-weight: 700;
    }

    /* ===== STATUS BADGES ===== */
    .status-badge {
      display: inline-block;
      padding: 2.5px 7px;
      font-size: 8px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      border-radius: 4px;
      text-align: center;
      min-width: 65px;
    }

    .status-paid {
      background-color: #dcfce7;
      color: #166534;
      border: 1px solid #bbf7d0;
    }

    .status-partial {
      background-color: #fef9c3;
      color: #854d0e;
      border: 1px solid #fef08a;
    }

    .status-advance {
      background-color: #dbeafe;
      color: #1e40af;
      border: 1px solid #bfdbfe;
    }

    .status-unpaid {
      background-color: #fee2e2;
      color: #991b1b;
      border: 1px solid #fecaca;
    }

    tfoot tr {
      background-color: #f9fafb !important;
      font-weight: 800;
    }

    tfoot td {
      border-top: 2px solid #3b82f6;
      border-bottom: 2px solid #3b82f6;
      font-size: 10px;
    }

    tfoot .money {
      font-size: 11px;
      color: #111827;
    }

    /* ===== SIGNATURE BLOCK ===== */
    .signatures {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 40px;
      margin-top: 35px;
      margin-bottom: 10px;
      page-break-inside: avoid;
    }

    .sig-line {
      border-top: 1px solid #374151;
      padding-top: 6px;
      text-align: center;
      font-size: 9.5px;
      font-weight: 600;
      color: #374151;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    /* ===== FOOTER ===== */
    footer {
      display: flex;
      justify-content: space-between;
      font-size: 8.5px;
      color: #6b7280;
      border-top: 1px solid #e5e7eb;
      padding-top: 8px;
      margin-top: auto;
    }

    /* ===== PRINT OVERRIDES ===== */
    @media print {
      body {
        background-color: #ffffff !important;
        background: #ffffff !important;
        padding: 0 !important;
        margin: 0 !important;
        color: #000000 !important;
      }
      .print-container {
        width: 100% !important;
        max-width: none !important;
        padding: 0 !important;
        margin: 0 !important;
        box-shadow: none !important;
        background-color: #ffffff !important;
        background: #ffffff !important;
      }
      @page {
        size: A4 landscape;
        margin: 10mm;
      }
      body { background: #fff !important; }
      .print-container { max-width: none; box-shadow: none; }
      .document-frame { padding: 2mm 4mm; }
      tbody tr:nth-child(even) { background: #f9fafb !important; }
    }

    /* ===== SCREEN PREVIEW ===== */
    @media screen {
      body { padding: 20px; }
      .print-container {
        box-shadow: 0 4px 24px rgba(0,0,0,0.12);
        border-radius: 8px;
      }
    }
  `;

  return '<!doctype html><html><head><title>Employees Salary Report – ' + escapeHtml(reportMonth) + '</title>' +
    '<style>' + stylesheet + '</style></head>' +
    '<body><main class="print-container"><section class="document-frame">' +
    '    <header class="report-header">' +
    '      <div class="brand">' +
    logoHtml +
    '        <div class="report-title">' +
    '          <h2>Official Payroll Report</h2>' +
    '          <h1>' + escapeHtml(companyName) + '</h1>' +
    '          <div class="subtitle">Employees Salary Report</div>' +
    '        </div>' +
    '      </div>' +
    '      <div class="report-meta">' +
    '        <strong>Report Term: ' + escapeHtml(reportMonth) + '</strong>' +
    '        <div>Generated: ' + escapeHtml(generated) + '</div>' +
    '        <div>Currency: AFN</div>' +
    '      </div>' +
    '    </header>' +
    '    <p class="section-title">Summary Metrics</p>' +
    '    <section class="summary-metrics">' +
    '      <div class="metric-box">' +
    '        <span class="metric-label">Total Employees</span>' +
    '        <strong class="metric-value">' + escapeHtml(summary.total_employees) + '</strong>' +
    '      </div>' +
    '      <div class="metric-box">' +
    '        <span class="metric-label">Total Payable</span>' +
    '        <strong class="metric-value">' + escapeHtml(currency(summary.total_payable_salary ?? summary.total_monthly_salary)) + '</strong>' +
    '      </div>' +
    '      <div class="metric-box metric-box-green">' +
    '        <span class="metric-label">Total Paid</span>' +
    '        <strong class="metric-value">' + escapeHtml(currency(summary.total_paid_this_month)) + '</strong>' +
    '      </div>' +
    '      <div class="metric-box ' + (summary.total_remaining_salary > 0 ? 'metric-box-amber' : '') + '">' +
    '        <span class="metric-label">Total Carry Forward</span>' +
    '        <strong class="metric-value">' + escapeHtml(currency(summary.total_remaining_salary)) + '</strong>' +
    '      </div>' +
    '      <div class="metric-box metric-box-green">' +
    '        <span class="metric-label">Fully Paid</span>' +
    '        <strong class="metric-value">' + escapeHtml(summary.fully_paid_employees) + '</strong>' +
    '      </div>' +
    '      <div class="metric-box ' + (summary.unpaid_employees > 0 ? 'metric-box-amber' : '') + '">' +
    '        <span class="metric-label">Unpaid</span>' +
    '        <strong class="metric-value">' + escapeHtml(summary.unpaid_employees) + '</strong>' +
    '      </div>' +
    '    </section>' +
    '    <p class="section-title">Salary Record Details</p>' +
    '    <table>' +
    '      <thead>' +
    '        <tr>' +
    '          <th style="width: 35px; text-align: center;">S.No</th>' +
    '          <th style="width: 75px;">Emp ID</th>' +
    '          <th style="width: 140px;">Employee Name</th>' +
    '          <th style="width: 170px;">Department / Position</th>' +
    '          <th style="width: 95px; text-align: right;">Total Payable</th>' +
    '          <th style="width: 95px; text-align: right;">Paid Salary</th>' +
    '          <th style="width: 95px; text-align: right;">Carry Forward</th>' +
    '          <th style="width: 90px; text-align: center;">Status</th>' +
    '          <th style="width: 90px; text-align: center;">Last Payment</th>' +
    '        </tr>' +
    '      </thead>' +
    '      <tbody>' + tableRows + '</tbody>' +
    '      <tfoot>' +
    '        <tr>' +
    '          <td colspan="4" style="text-align: right; padding-right: 15px;">Totals</td>' +
    '          <td class="money">' + escapeHtml(currency(summary.total_payable_salary ?? summary.total_monthly_salary)) + '</td>' +
    '          <td class="money">' + escapeHtml(currency(summary.total_paid_this_month)) + '</td>' +
    '          <td class="money">' + escapeHtml(currency(summary.total_remaining_salary)) + '</td>' +
    '          <td colspan="2"></td>' +
    '        </tr>' +
    '      </tfoot>' +
    '    </table>' +
    '    <section class="signatures">' +
    '      <div class="sig-line">Prepared By</div>' +
    '      <div class="sig-line">Accountant Signature</div>' +
    '      <div class="sig-line">Manager Signature</div>' +
    '    </section>' +
    '    <footer><span>Generated by Bawar Star Cash Book</span><span>' + escapeHtml(companyName) + '</span></footer>' +
    '  </section>' +
    '  </main>' +
    '  <script>' +
    '    (function() {' +
    '      var logo = document.getElementById("report-logo");' +
    '      function doPrint() {' +
    '        window.focus();' +
    '        window.print();' +
    '      }' +
    '      if (logo && !logo.complete) {' +
    '        logo.onload = function() { setTimeout(doPrint, 200); };' +
    '        logo.onerror = function() {' +
    '          var initials = "' + escapeHtml(initials) + '";' +
    '          var placeholder = document.createElement("div");' +
    '          placeholder.className = "logo logo-placeholder";' +
    '          placeholder.innerHTML = "<span>" + initials + "</span>";' +
    '          logo.parentNode.replaceChild(placeholder, logo);' +
    '          setTimeout(doPrint, 200);' +
    '        };' +
    '        setTimeout(doPrint, 3000);' +
    '      } else {' +
    '        setTimeout(doPrint, 300);' +
    '      }' +
    '    })();' +
    '  </script>' +
    '  </body></html>';
}
