export function salaryMonthStart(value = new Date().toISOString().slice(0, 10)) {
  return `${String(value).slice(0, 7)}-01`;
}

function inputDate(date) {
  const value = new Date(date);
  value.setMinutes(value.getMinutes() - value.getTimezoneOffset());
  return value.toISOString().slice(0, 10);
}

export function nextMonth(value) {
  const date = new Date(`${value}T00:00:00`);
  date.setMonth(date.getMonth() + 1);
  return salaryMonthStart(inputDate(date));
}

export function previousMonth(value) {
  const date = new Date(`${value}T00:00:00`);
  date.setMonth(date.getMonth() - 1);
  return salaryMonthStart(inputDate(date));
}

export function amountFor(employee, transaction) {
  const empCurr = (employee?.currency || 'AFN').toUpperCase();
  if (transaction.currency && transaction.currency.toUpperCase() === empCurr && Number(transaction.amount) > 0) {
    return Number(transaction.amount);
  }
  if (empCurr === 'USD') {
    return Number(transaction.usd_out || transaction.amount || 0);
  }
  return Number(transaction.cash_out_afn || transaction.amount || 0);
}

export function earnedSalaryForMonth(employee, targetMonthStart) {
  const monthlySalary = Number(employee?.monthly_salary || 0);
  if (!employee?.joining_date) return monthlySalary;

  const [tYear, tMonth] = targetMonthStart.split('-').map(Number);
  const daysInMonth = new Date(tYear, tMonth, 0).getDate();
  const monthStartDate = `${targetMonthStart.slice(0, 7)}-01`;
  const monthEndDate = `${targetMonthStart.slice(0, 7)}-${String(daysInMonth).padStart(2, '0')}`;

  const joinDate = employee.joining_date;
  if (monthEndDate < joinDate) return 0;

  if (employee.employment_end_date && monthStartDate > employee.employment_end_date) return 0;

  let startDay = 1;
  if (monthStartDate === `${joinDate.slice(0, 7)}-01`) {
    startDay = parseInt(joinDate.slice(8, 10), 10) || 1;
  }

  let finalDay = daysInMonth;
  if (employee.employment_end_date && monthStartDate === `${employee.employment_end_date.slice(0, 7)}-01`) {
    finalDay = Math.min(parseInt(employee.employment_end_date.slice(8, 10), 10) || daysInMonth, daysInMonth);
  }

  if (startDay > 1 || finalDay < daysInMonth) {
    const activeDays = Math.max(0, finalDay - startDay + 1);
    return Number(((monthlySalary / daysInMonth) * activeDays).toFixed(2));
  }

  return monthlySalary;
}

export function earnedThroughMonth(employee, salaryMonth) {
  if (!employee?.joining_date) return Number(employee?.monthly_salary || 0);
  let current = salaryMonthStart(employee.joining_date);
  let total = 0;
  while (current <= salaryMonth) {
    total += earnedSalaryForMonth(employee, current);
    current = nextMonth(current);
  }
  return Number(total.toFixed(2));
}

export function paidThroughMonth(employee, transactions, salaryMonth) {
  return transactions
    .filter((transaction) => (
      Number(transaction.employee_id) === Number(employee?.id)
      && transaction.transaction_type === 'cash_out'
      && transaction.category === 'salary'
      && salaryMonthStart(transaction.salary_month || transaction.date) <= salaryMonth
    ))
    .reduce((total, transaction) => total + amountFor(employee, transaction), 0);
}

export function employeeSalarySnapshot(employee, transactions = [], month) {
  if (!employee) return null;
  const salaryMonth = salaryMonthStart(month);
  const matching = transactions.filter((transaction) => (
    Number(transaction.employee_id) === Number(employee.id)
    && transaction.transaction_type === 'cash_out'
    && transaction.category === 'salary'
    && salaryMonthStart(transaction.salary_month || transaction.date) === salaryMonth
  ));

  const paidAmount = matching
    .filter((transaction) => (transaction.payroll_kind || 'salary') === 'salary')
    .reduce((total, transaction) => total + amountFor(employee, transaction), 0);

  const advanceTaken = matching
    .filter((transaction) => transaction.payroll_kind === 'advance')
    .reduce((total, transaction) => total + amountFor(employee, transaction), 0);

  const currentMonthEarned = earnedSalaryForMonth(employee, salaryMonth);
  const previousSalaryMonth = previousMonth(salaryMonth);
  const previousCarryForward = employee.joining_date
    ? Number((earnedThroughMonth(employee, previousSalaryMonth) - paidThroughMonth(employee, transactions, previousSalaryMonth)).toFixed(2))
    : 0;

  const totalPayableSalary = Number((currentMonthEarned + previousCarryForward).toFixed(2));
  const remainingSalary = Number((totalPayableSalary - paidAmount - advanceTaken).toFixed(2));

  let paymentStatus = 'Unpaid';
  if (remainingSalary < 0) paymentStatus = 'Advance';
  else if (remainingSalary === 0 && (paidAmount > 0 || totalPayableSalary === 0)) paymentStatus = 'Paid';
  else if (paidAmount > 0) paymentStatus = 'Partial Paid';

  return {
    monthly_salary: Number(employee.monthly_salary || 0),
    earned_salary: currentMonthEarned,
    paid_amount: Number(paidAmount.toFixed(2)),
    advance_taken: Number(advanceTaken.toFixed(2)),
    previous_carry_forward_balance: previousCarryForward,
    total_payable_salary: totalPayableSalary,
    remaining_salary: remainingSalary,
    carry_forward_balance: remainingSalary,
    payment_status: paymentStatus,
    currency: employee.currency || 'AFN',
    salary_month: salaryMonth
  };
}

export function calculatePayrollMetrics(employees = [], transactions = [], month, year) {
  const targetMonth = `${year || new Date().getFullYear()}-${String(month || new Date().getMonth() + 1).padStart(2, '0')}-01`;
  const activeEmployees = employees.filter((e) => (e.status || 'active') === 'active');

  let totalMonthlySalaryAFN = 0;
  let totalMonthlySalaryUSD = 0;
  let totalPayableAFN = 0;
  let totalPayableUSD = 0;
  let totalPaidAFN = 0;
  let totalPaidUSD = 0;
  let totalRemainingAFN = 0;
  let totalRemainingUSD = 0;
  let fullyPaidCount = 0;
  let partialPaidCount = 0;
  let unpaidCount = 0;
  let advanceCount = 0;

  activeEmployees.forEach((emp) => {
    const snap = employeeSalarySnapshot(emp, transactions, targetMonth);
    const curr = (emp.currency || 'AFN').toUpperCase();
    const isUSD = curr === 'USD';

    if (isUSD) {
      totalMonthlySalaryUSD += snap.monthly_salary;
      totalPayableUSD += snap.total_payable_salary;
      totalPaidUSD += snap.paid_amount;
      totalRemainingUSD += Math.max(0, snap.remaining_salary);
    } else {
      totalMonthlySalaryAFN += snap.monthly_salary;
      totalPayableAFN += snap.total_payable_salary;
      totalPaidAFN += snap.paid_amount;
      totalRemainingAFN += Math.max(0, snap.remaining_salary);
    }

    if (snap.payment_status === 'Paid') fullyPaidCount++;
    else if (snap.payment_status === 'Partial Paid') partialPaidCount++;
    else if (snap.payment_status === 'Advance') advanceCount++;
    else unpaidCount++;
  });

  return {
    total_employees: employees.length,
    active_employees: activeEmployees.length,
    total_monthly_salary_afn: Number(totalMonthlySalaryAFN.toFixed(2)),
    total_monthly_salary_usd: Number(totalMonthlySalaryUSD.toFixed(2)),
    total_payable_afn: Number(totalPayableAFN.toFixed(2)),
    total_payable_usd: Number(totalPayableUSD.toFixed(2)),
    total_paid_afn: Number(totalPaidAFN.toFixed(2)),
    total_paid_usd: Number(totalPaidUSD.toFixed(2)),
    total_remaining_afn: Number(totalRemainingAFN.toFixed(2)),
    total_remaining_usd: Number(totalRemainingUSD.toFixed(2)),
    fully_paid_count: fullyPaidCount,
    partial_paid_count: partialPaidCount,
    unpaid_count: unpaidCount,
    advance_count: advanceCount
  };
}

