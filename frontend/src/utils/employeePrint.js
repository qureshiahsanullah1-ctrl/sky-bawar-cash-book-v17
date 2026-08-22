import { currency as formatCurrency, dateLabel, jalaliDateLabel, jalaliFullDateLabel, jalaliPeriodLabel } from './format';

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const MONTH_NAMES = [
  'January / حمل',
  'February / ثور',
  'March / جوزا',
  'April / سرطان',
  'May / اسد',
  'June / سنبله',
  'July / میزان',
  'August / عقرب',
  'September / قوس',
  'October / جدی',
  'November / دلو',
  'December / حوت'
];

export function generateEmployeeLedgerPrintHtml({
  employee,
  ledgerData,
  entries,
  companyName = 'BAWAR STAR PLASTIC INDUSTRY',
  companyLogo = '',
  currencyCode = 'AFN'
}) {
  const printedAt = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  const printedAtJalali = jalaliFullDateLabel(new Date());

  const displayEntries = entries || ledgerData?.entries || [];
  const currency = currencyCode || employee?.currency || 'AFN';

  let totalAccruedSum = 0;
  let totalPaidSum = 0;
  let totalBonusSum = 0;
  let totalDeductSum = 0;
  let totalAdjSum = 0;

  const rowsHtml = displayEntries.map((e, index) => {
    const accNum = Number(e.salary_accrued || e.debit || 0);
    const payNum = Number(e.payment || e.credit || 0);
    const bonusNum = Number(e.bonus || 0);
    const deductNum = Number(e.deduction || 0);
    const adjNum = Number(e.adjustment || 0);

    totalAccruedSum += accNum;
    totalPaidSum += payNum;
    totalBonusSum += bonusNum;
    totalDeductSum += deductNum;
    totalAdjSum += adjNum;

    const acc = accNum > 0 ? formatCurrency(accNum, currency) : '-';
    const pay = payNum > 0 ? formatCurrency(payNum, currency) : '-';
    const bonus = bonusNum > 0 ? `+${formatCurrency(bonusNum, currency)}` : '-';
    const deduct = deductNum > 0 ? formatCurrency(deductNum, currency) : '-';
    const adj = adjNum !== 0 ? (adjNum > 0 ? `+${formatCurrency(adjNum, currency)}` : formatCurrency(adjNum, currency)) : '-';
    const bal = formatCurrency(e.running_balance, currency);
    const typeLabel = (e.entry_type || '').replace(/_/g, ' ');

    let badgeClass = 'badge-default';
    if (e.entry_type === 'salary_accrual') badgeClass = 'badge-blue';
    else if (e.entry_type === 'salary_payment') badgeClass = 'badge-green';
    else if (e.entry_type === 'bonus') badgeClass = 'badge-teal';
    else if (e.entry_type === 'deduction' || e.entry_type === 'advance') badgeClass = 'badge-red';
    else if (e.entry_type === 'adjustment' || e.entry_type === 'reversal') badgeClass = 'badge-amber';

    const rowBg = index % 2 === 0 ? 'bg-even' : 'bg-odd';
    const jDate = jalaliDateLabel(e.date);
    const jMonth = jalaliFullDateLabel(e.date).split(' ')[1] || '';
    const jPeriod = jalaliPeriodLabel(e.period);

    return [
      '<tr class="' + rowBg + '">',
      '  <td class="col-date">',
      '    <div class="date-greg">' + escapeHtml(dateLabel(e.date)) + '</div>',
      '    <div class="date-jalali">' + escapeHtml(jDate) + ' (' + escapeHtml(jMonth) + ')</div>',
      '  </td>',
      '  <td class="col-period">',
      '    <div>' + escapeHtml(e.period || '-') + '</div>',
      '    <div class="period-jalali">' + escapeHtml(jPeriod) + '</div>',
      '  </td>',
      '  <td class="col-type"><span class="badge ' + badgeClass + '">' + escapeHtml(typeLabel) + '</span></td>',
      '  <td class="col-desc">' + escapeHtml(e.description || '-') + '</td>',
      '  <td class="col-num text-blue">' + escapeHtml(acc) + '</td>',
      '  <td class="col-num text-green">' + escapeHtml(pay) + '</td>',
      '  <td class="col-num text-teal">' + escapeHtml(bonus) + '</td>',
      '  <td class="col-num text-red">' + escapeHtml(deduct) + '</td>',
      '  <td class="col-num text-amber">' + escapeHtml(adj) + '</td>',
      '  <td class="col-num text-bold ' + (e.running_balance < 0 ? 'text-negative' : '') + '">' + escapeHtml(bal) + '</td>',
      '  <td class="col-ref">' + escapeHtml(e.reference || '-') + '</td>',
      '</tr>'
    ].join('\n');
  }).join('');

  const summary = ledgerData?.summary || {};
  const totalAccrued = formatCurrency(summary.total_accrued || totalAccruedSum, currency);
  const totalPaid = formatCurrency(summary.total_paid || totalPaidSum, currency);
  const totalAdjustments = formatCurrency(summary.total_adjustments || totalAdjSum, currency);
  const outstandingBalance = formatCurrency(summary.outstanding_balance || 0, currency);

  const safeEmpName = escapeHtml(employee?.full_name || 'Employee');
  const safeEmpCode = escapeHtml(employee?.employee_code || `EMP-${employee?.id || ''}`);
  const safeEmpPos = escapeHtml(employee?.position || 'N/A');
  const safeEmpDept = escapeHtml(employee?.department || 'General');
  const safeCompName = escapeHtml(companyName);
  const logoHtml = companyLogo ? '<img src="' + escapeHtml(companyLogo) + '" class="company-logo" alt="Logo" />' : '';
  const joiningDateStr = employee?.joining_date ? `${escapeHtml(dateLabel(employee.joining_date))} (${escapeHtml(jalaliFullDateLabel(employee.joining_date))})` : 'Not Set';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Salary Ledger - ${safeEmpName}</title>
  <style>
    @page { size: A4 landscape; margin: 8mm 12mm 10mm 12mm; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .no-print { display: none !important; } }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; background: #fff; font-size: 10.5px; line-height: 1.4; padding: 8px 12px; }
    .brand-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 12px; }
    .company-info { display: flex; align-items: center; gap: 12px; }
    .company-logo { width: 44px; height: 44px; object-fit: contain; border-radius: 6px; }
    .company-title { font-size: 17px; font-weight: 800; color: #0f172a; text-transform: uppercase; }
    .company-sub { font-size: 9.5px; color: #64748b; font-weight: 600; text-transform: uppercase; }
    .doc-meta { text-align: right; }
    .doc-title { font-size: 15px; font-weight: 800; color: #2563eb; text-transform: uppercase; }
    .doc-date { font-size: 9.5px; color: #64748b; margin-top: 2px; }
    .profile-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 12px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; }
    .emp-name { font-size: 14px; font-weight: 700; color: #0f172a; }
    .emp-code { display: inline-block; background: #e2e8f0; color: #334155; font-size: 9.5px; font-weight: 700; padding: 2px 6px; border-radius: 4px; margin-left: 6px; }
    .emp-details { display: flex; gap: 14px; margin-top: 3px; font-size: 9.5px; color: #475569; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 12px; }
    .kpi-card { background: #fff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 6px 10px; }
    .kpi-title { font-size: 8.5px; font-weight: 700; color: #64748b; text-transform: uppercase; }
    .kpi-value { font-size: 14px; font-weight: 800; color: #0f172a; margin-top: 2px; font-family: monospace; }
    .kpi-card.accrued .kpi-value { color: #2563eb; }
    .kpi-card.paid .kpi-value { color: #16a34a; }
    .kpi-card.adj .kpi-value { color: #9333ea; }
    .kpi-card.balance { background: #f0f9ff; border-color: #93c5fd; }
    .kpi-card.balance .kpi-value { color: #1d4ed8; }
    table.ledger-table { width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; }
    table.ledger-table th { background: #0f172a; color: #fff; font-size: 9px; font-weight: 700; text-transform: uppercase; padding: 6px 8px; text-align: left; }
    table.ledger-table td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; font-size: 9.5px; color: #1e293b; }
    table.ledger-table tr.bg-even { background: #fff; }
    table.ledger-table tr.bg-odd { background: #f8fafc; }
    .col-date { width: 12%; font-weight: 600; white-space: nowrap; }
    .col-period { width: 8%; font-family: monospace; color: #64748b; white-space: nowrap; }
    .col-type { width: 10%; white-space: nowrap; }
    .col-desc { width: 22%; word-break: break-word; }
    .col-num { width: 9%; text-align: right; font-family: monospace; font-weight: 600; white-space: nowrap; }
    .col-ref { width: 4%; text-align: center; font-family: monospace; color: #94a3b8; font-size: 8.5px; }
    .date-greg { font-weight: 700; color: #0f172a; }
    .date-jalali { font-size: 8px; color: #4338ca; font-family: monospace; font-weight: 600; }
    .period-jalali { font-size: 8px; color: #64748b; }
    .text-blue { color: #2563eb; }
    .text-green { color: #16a34a; }
    .text-teal { color: #0d9488; }
    .text-red { color: #dc2626; }
    .text-amber { color: #d97706; }
    .text-bold { font-weight: 800; color: #0f172a; }
    .text-negative { color: #d97706 !important; }
    .badge { display: inline-block; padding: 1px 5px; border-radius: 4px; font-size: 8px; font-weight: 700; text-transform: uppercase; }
    .badge-blue { background: #dbeafe; color: #1e40af; }
    .badge-green { background: #dcfce7; color: #166534; }
    .badge-teal { background: #ccfbf1; color: #115e59; }
    .badge-red { background: #ffe4e6; color: #9f1239; }
    .badge-amber { background: #fef3c7; color: #92400e; }
    .badge-default { background: #f1f5f9; color: #475569; }
    table.ledger-table tfoot td { background: #f1f5f9; font-weight: 800; border-top: 2px solid #94a3b8; padding: 6px 8px; font-size: 9.5px; }
    .footer-section { margin-top: 20px; display: flex; justify-content: space-between; align-items: flex-end; page-break-inside: avoid; }
    .signatures { display: flex; gap: 35px; }
    .sig-box { border-top: 1px solid #94a3b8; width: 130px; padding-top: 4px; text-align: center; font-size: 8.5px; font-weight: 600; color: #475569; text-transform: uppercase; }
    .statement-footer { text-align: right; font-size: 8.5px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="brand-header">
    <div class="company-info">
      ${logoHtml}
      <div>
        <div class="company-title">${safeCompName}</div>
        <div class="company-sub">Official Employee Payroll System</div>
      </div>
    </div>
    <div class="doc-meta">
      <div class="doc-title">Employee Salary Ledger</div>
      <div class="doc-date">Generated on: ${escapeHtml(printedAt)} • ${escapeHtml(printedAtJalali)}</div>
    </div>
  </div>

  <div class="profile-card">
    <div>
      <span class="emp-name">${safeEmpName}</span>
      <span class="emp-code">${safeEmpCode}</span>
      <div class="emp-details">
        <span>Position: <strong>${safeEmpPos}</strong></span>
        <span>Department: <strong>${safeEmpDept}</strong></span>
        <span>Joining Date: <strong>${joiningDateStr}</strong></span>
      </div>
    </div>
    <div style="text-align: right;">
      <div style="font-size: 9.5px; color: #64748b;">Statement Currency</div>
      <div style="font-size: 13px; font-weight: 800; color: #0f172a;">${escapeHtml(currency)}</div>
    </div>
  </div>

  <div class="kpi-grid">
    <div class="kpi-card accrued"><div class="kpi-title">Total Accrued</div><div class="kpi-value">${escapeHtml(totalAccrued)}</div></div>
    <div class="kpi-card paid"><div class="kpi-title">Total Paid</div><div class="kpi-value">${escapeHtml(totalPaid)}</div></div>
    <div class="kpi-card adj"><div class="kpi-title">Total Adjustments</div><div class="kpi-value">${escapeHtml(totalAdjustments)}</div></div>
    <div class="kpi-card balance"><div class="kpi-title">Outstanding Balance</div><div class="kpi-value">${escapeHtml(outstandingBalance)}</div></div>
  </div>

  <table class="ledger-table">
    <thead>
      <tr>
        <th class="col-date">Date / تاریخ</th>
        <th class="col-period">Period / دوره</th>
        <th class="col-type">Entry Type</th>
        <th class="col-desc">Description</th>
        <th style="text-align: right;">Accrued</th>
        <th style="text-align: right;">Payment</th>
        <th style="text-align: right;">Bonus</th>
        <th style="text-align: right;">Deduction</th>
        <th style="text-align: right;">Adjustment</th>
        <th style="text-align: right;">Running Balance</th>
        <th style="text-align: center;">Ref</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml.length ? rowsHtml : '<tr><td colspan="11" style="text-align:center; padding: 20px;">No ledger entries found.</td></tr>'}
    </tbody>
    <tfoot>
      <tr>
        <td colspan="4">Summary Totals (${displayEntries.length} entries)</td>
        <td class="col-num text-blue">${escapeHtml(totalAccrued)}</td>
        <td class="col-num text-green">${escapeHtml(totalPaid)}</td>
        <td class="col-num text-teal">${totalBonusSum > 0 ? '+' + escapeHtml(formatCurrency(totalBonusSum, currency)) : '-'}</td>
        <td class="col-num text-red">${totalDeductSum > 0 ? escapeHtml(formatCurrency(totalDeductSum, currency)) : '-'}</td>
        <td class="col-num text-amber">${totalAdjSum !== 0 ? (totalAdjSum > 0 ? '+' : '') + escapeHtml(formatCurrency(totalAdjSum, currency)) : '-'}</td>
        <td class="col-num text-bold">${escapeHtml(outstandingBalance)}</td>
        <td></td>
      </tr>
    </tfoot>
  </table>

  <div class="footer-section">
    <div class="signatures">
      <div class="sig-box">Prepared By</div>
      <div class="sig-box">Approved By</div>
      <div class="sig-box">Employee Signature</div>
    </div>
    <div class="statement-footer">
      <div>Computer Generated Official Financial Record</div>
      <div>${safeCompName}</div>
    </div>
  </div>

  <script>
    window.onload = function() {
      window.focus();
      setTimeout(function() { window.print(); }, 250);
    };
  </script>
</body>
</html>`;
}

/**
 * Multi-Mode Salary Report Print Generator
 * @param {Object} options
 * @param {Array} options.rows - Employee payroll rows
 * @param {Array} options.payments - Payment transactions
 * @param {Object} options.summary - Summary metrics
 * @param {Object} options.filters - Filter state { month, year, department, company }
 * @param {String} options.printMode - 'all' | 'salaries_only' | 'payments_only' | 'unpaid_only'
 * @param {String} options.companyName
 * @param {String} options.companyLogo
 * @param {String} options.currencyCode
 */
export function generateSalaryReportPrintHtml({
  rows = [],
  payments = [],
  summary = {},
  filters = {},
  printMode = 'all',
  companyName = 'BAWAR STAR PLASTIC INDUSTRY',
  companyLogo = '',
  currencyCode = 'AFN'
}) {
  const printedAt = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  const printedAtJalali = jalaliFullDateLabel(new Date());

  const monthIdx = Number(filters?.month || new Date().getMonth() + 1) - 1;
  const monthName = MONTH_NAMES[monthIdx] || `Month ${filters?.month}`;
  const yearStr = filters?.year || new Date().getFullYear();
  const periodStr = `${yearStr}-${String(filters?.month || new Date().getMonth() + 1).padStart(2, '0')}`;
  const jalaliPeriod = jalaliPeriodLabel(periodStr);

  const safeCompName = escapeHtml(companyName);
  const logoHtml = companyLogo ? `<img src="${escapeHtml(companyLogo)}" class="company-logo" alt="Logo" />` : '';

  // Determine Title & Subtitle based on printMode
  let docTitle = 'Comprehensive Payroll Statement';
  let docSubtitle = 'Full Salary, Payments & Balance Breakdown';
  let tableHeaderHtml = '';
  let tableRowsHtml = '';
  let tableFooterHtml = '';
  let kpiCardsHtml = '';

  // Filter rows based on mode
  let filteredRows = [...rows];
  if (printMode === 'unpaid_only') {
    filteredRows = rows.filter((r) => Number(r.remaining_salary || 0) > 0 || r.payment_status === 'Unpaid' || r.payment_status === 'Partial Paid');
  }

  // MODE 1: BASE SALARIES ONLY
  if (printMode === 'salaries_only') {
    docTitle = 'Employee Base Salaries & Contracts Roster';
    docSubtitle = 'Contractual Base Monthly Salary Obligations';

    const totalBaseSalary = rows.reduce((sum, r) => sum + Number(r.monthly_salary || 0), 0);

    kpiCardsHtml = `
      <div class="kpi-card"><div class="kpi-title">Total Employees</div><div class="kpi-value">${rows.length}</div></div>
      <div class="kpi-card"><div class="kpi-title">Monthly Salary Budget</div><div class="kpi-value text-blue">${escapeHtml(formatCurrency(totalBaseSalary, currencyCode))}</div></div>
      <div class="kpi-card"><div class="kpi-title">Payroll Currency</div><div class="kpi-value">${escapeHtml(currencyCode)}</div></div>
      <div class="kpi-card"><div class="kpi-title">Fiscal Period</div><div class="kpi-value text-slate">${escapeHtml(jalaliPeriod)}</div></div>
    `;

    tableHeaderHtml = `
      <tr>
        <th style="width: 4%; text-align: center;">#</th>
        <th style="width: 12%;">Employee Code</th>
        <th style="width: 22%;">Employee Name</th>
        <th style="width: 18%;">Department</th>
        <th style="width: 18%;">Position / Title</th>
        <th style="width: 13%;">Joining Date</th>
        <th style="width: 13%; text-align: right;">Base Monthly Salary</th>
      </tr>
    `;

    tableRowsHtml = rows.map((r, i) => {
      const jJoin = r.joining_date ? jalaliDateLabel(r.joining_date) : '-';
      const gJoin = r.joining_date ? dateLabel(r.joining_date) : 'Not Set';
      return `
        <tr class="${i % 2 === 0 ? 'bg-even' : 'bg-odd'}">
          <td style="text-align: center; font-weight: bold; color: #64748b;">${i + 1}</td>
          <td style="font-family: monospace; font-weight: 700; color: #1e293b;">${escapeHtml(r.employee_code || `EMP-${r.id}`)}</td>
          <td style="font-weight: 700; color: #0f172a;">${escapeHtml(r.employee_name || r.full_name)}</td>
          <td>${escapeHtml(r.department || '-')}</td>
          <td>${escapeHtml(r.position || '-')}</td>
          <td>
            <div style="font-weight: 600;">${escapeHtml(gJoin)}</div>
            <div style="font-size: 8px; color: #4338ca; font-family: monospace;">${escapeHtml(jJoin)}</div>
          </td>
          <td style="text-align: right; font-family: monospace; font-weight: 800; color: #2563eb; font-size: 11px;">
            ${escapeHtml(formatCurrency(r.monthly_salary, r.currency || currencyCode))}
          </td>
        </tr>
      `;
    }).join('');

    tableFooterHtml = `
      <tr>
        <td colspan="6" style="text-transform: uppercase; font-weight: 800;">Total Monthly Payroll Commitment (${rows.length} Employees)</td>
        <td style="text-align: right; font-family: monospace; font-weight: 900; color: #2563eb; font-size: 11.5px;">
          ${escapeHtml(formatCurrency(totalBaseSalary, currencyCode))}
        </td>
      </tr>
    `;
  }

  // MODE 2: PAYMENTS ONLY (HOW MUCH I PAID)
  else if (printMode === 'payments_only') {
    docTitle = 'Salary Disbursements & Payments Report';
    docSubtitle = 'Detailed Record of All Salary Payments Disbursed';

    const paymentList = payments && payments.length > 0 ? payments : [];
    const totalPaidSum = paymentList.reduce((sum, p) => sum + Number(p.cash_out_afn || p.amount || 0), 0);

    kpiCardsHtml = `
      <div class="kpi-card paid"><div class="kpi-title">Total Disbursed</div><div class="kpi-value">${escapeHtml(formatCurrency(totalPaidSum, currencyCode))}</div></div>
      <div class="kpi-card"><div class="kpi-title">Disbursement Count</div><div class="kpi-value">${paymentList.length} Transactions</div></div>
      <div class="kpi-card"><div class="kpi-title">Payroll Period</div><div class="kpi-value text-blue">${escapeHtml(periodStr)} (${escapeHtml(jalaliPeriod)})</div></div>
      <div class="kpi-card"><div class="kpi-title">Currency</div><div class="kpi-value">${escapeHtml(currencyCode)}</div></div>
    `;

    tableHeaderHtml = `
      <tr>
        <th style="width: 4%; text-align: center;">#</th>
        <th style="width: 14%;">Payment Date / تاریخ</th>
        <th style="width: 11%;">Period / دوره</th>
        <th style="width: 22%;">Recipient Employee</th>
        <th style="width: 11%;">Payment Method</th>
        <th style="width: 24%;">Payment Description / Note</th>
        <th style="width: 14%; text-align: right;">Amount Disbursed</th>
      </tr>
    `;

    tableRowsHtml = paymentList.map((p, i) => {
      const gDate = dateLabel(p.date);
      const jDate = jalaliDateLabel(p.date);
      const jMonth = jalaliFullDateLabel(p.date).split(' ')[1] || '';
      const pPeriod = p.salary_month || periodStr;
      const jPPeriod = jalaliPeriodLabel(pPeriod);
      const pAmt = Number(p.cash_out_afn || p.amount || 0);

      return `
        <tr class="${i % 2 === 0 ? 'bg-even' : 'bg-odd'}">
          <td style="text-align: center; font-weight: bold; color: #64748b;">${i + 1}</td>
          <td>
            <div style="font-weight: 700; color: #0f172a;">${escapeHtml(gDate)}</div>
            <div style="font-size: 8px; color: #4338ca; font-family: monospace;">${escapeHtml(jDate)} (${escapeHtml(jMonth)})</div>
          </td>
          <td>
            <div style="font-family: monospace; font-weight: 600;">${escapeHtml(pPeriod)}</div>
            <div style="font-size: 8px; color: #64748b;">${escapeHtml(jPPeriod)}</div>
          </td>
          <td>
            <div style="font-weight: 800; color: #0f172a;">${escapeHtml(p.account_name || p.employee_name || 'Employee')}</div>
            <div style="font-size: 8px; color: #64748b; font-family: monospace;">${escapeHtml(p.employee_code || '')}</div>
          </td>
          <td>
            <span class="badge badge-green">${escapeHtml(p.payment_method || 'Cash')}</span>
          </td>
          <td style="color: #334155;">${escapeHtml(p.detail || p.description || 'Salary Payment')}</td>
          <td style="text-align: right; font-family: monospace; font-weight: 800; color: #16a34a; font-size: 11px;">
            ${escapeHtml(formatCurrency(pAmt, p.currency || currencyCode))}
          </td>
        </tr>
      `;
    }).join('');

    tableFooterHtml = `
      <tr>
        <td colspan="6" style="text-transform: uppercase; font-weight: 800;">Total Salary Disbursed (${paymentList.length} Payments)</td>
        <td style="text-align: right; font-family: monospace; font-weight: 900; color: #16a34a; font-size: 11.5px;">
          ${escapeHtml(formatCurrency(totalPaidSum, currencyCode))}
        </td>
      </tr>
    `;
  }

  // MODE 3: UNPAID / OUTSTANDING BALANCES ONLY
  else if (printMode === 'unpaid_only') {
    docTitle = 'Outstanding & Unpaid Salaries Report';
    docSubtitle = 'Employees with Pending Payroll Balances & Carry-Forwards';

    const totalUnpaidSum = filteredRows.reduce((sum, r) => sum + Math.max(Number(r.remaining_salary || 0), 0), 0);

    kpiCardsHtml = `
      <div class="kpi-card balance"><div class="kpi-title">Total Unpaid Debt</div><div class="kpi-value text-amber">${escapeHtml(formatCurrency(totalUnpaidSum, currencyCode))}</div></div>
      <div class="kpi-card"><div class="kpi-title">Pending Employees</div><div class="kpi-value">${filteredRows.length} of ${rows.length}</div></div>
      <div class="kpi-card"><div class="kpi-title">Payroll Period</div><div class="kpi-value text-blue">${escapeHtml(periodStr)} (${escapeHtml(jalaliPeriod)})</div></div>
      <div class="kpi-card"><div class="kpi-title">Currency</div><div class="kpi-value">${escapeHtml(currencyCode)}</div></div>
    `;

    tableHeaderHtml = `
      <tr>
        <th style="width: 4%; text-align: center;">#</th>
        <th style="width: 12%;">Employee Code</th>
        <th style="width: 22%;">Employee Name</th>
        <th style="width: 16%;">Department / Position</th>
        <th style="width: 14%; text-align: right;">Payable Salary</th>
        <th style="width: 14%; text-align: right;">Paid So Far</th>
        <th style="width: 18%; text-align: right;">Outstanding Balance Due</th>
      </tr>
    `;

    tableRowsHtml = filteredRows.map((r, i) => {
      return `
        <tr class="${i % 2 === 0 ? 'bg-even' : 'bg-odd'}">
          <td style="text-align: center; font-weight: bold; color: #64748b;">${i + 1}</td>
          <td style="font-family: monospace; font-weight: 700; color: #1e293b;">${escapeHtml(r.employee_code || `EMP-${r.id}`)}</td>
          <td style="font-weight: 700; color: #0f172a;">${escapeHtml(r.employee_name || r.full_name)}</td>
          <td>${escapeHtml(r.department || '-')} / ${escapeHtml(r.position || '-')}</td>
          <td style="text-align: right; font-family: monospace; font-weight: 600;">
            ${escapeHtml(formatCurrency(r.total_payable_salary ?? r.monthly_salary, r.currency || currencyCode))}
          </td>
          <td style="text-align: right; font-family: monospace; font-weight: 600; color: #16a34a;">
            ${escapeHtml(formatCurrency(r.paid_salary, r.currency || currencyCode))}
          </td>
          <td style="text-align: right; font-family: monospace; font-weight: 800; color: #d97706; font-size: 11px;">
            ${escapeHtml(formatCurrency(r.remaining_salary, r.currency || currencyCode))}
          </td>
        </tr>
      `;
    }).join('');

    tableFooterHtml = `
      <tr>
        <td colspan="6" style="text-transform: uppercase; font-weight: 800;">Total Outstanding Balance Due (${filteredRows.length} Employees)</td>
        <td style="text-align: right; font-family: monospace; font-weight: 900; color: #d97706; font-size: 11.5px;">
          ${escapeHtml(formatCurrency(totalUnpaidSum, currencyCode))}
        </td>
      </tr>
    `;
  }

  // MODE 4: ALL PAYROLL STATEMENT (FULL SUMMARY)
  else {
    const totalPayable = summary.total_payable_salary || rows.reduce((s, r) => s + Number(r.total_payable_salary ?? r.monthly_salary ?? 0), 0);
    const totalPaid = summary.total_paid_this_month || rows.reduce((s, r) => s + Number(r.paid_salary || 0), 0);
    const totalRemaining = summary.total_remaining_salary || rows.reduce((s, r) => s + Math.max(Number(r.remaining_salary || 0), 0), 0);

    kpiCardsHtml = `
      <div class="kpi-card"><div class="kpi-title">Total Enrolled</div><div class="kpi-value">${rows.length}</div></div>
      <div class="kpi-card accrued"><div class="kpi-title">Total Payable</div><div class="kpi-value text-blue">${escapeHtml(formatCurrency(totalPayable, currencyCode))}</div></div>
      <div class="kpi-card paid"><div class="kpi-title">Total Disbursed</div><div class="kpi-value text-green">${escapeHtml(formatCurrency(totalPaid, currencyCode))}</div></div>
      <div class="kpi-card balance"><div class="kpi-title">Remaining Balance</div><div class="kpi-value text-amber">${escapeHtml(formatCurrency(totalRemaining, currencyCode))}</div></div>
    `;

    tableHeaderHtml = `
      <tr>
        <th style="width: 3%; text-align: center;">#</th>
        <th style="width: 10%;">Employee Code</th>
        <th style="width: 18%;">Employee Name</th>
        <th style="width: 15%;">Dept / Position</th>
        <th style="width: 11%; text-align: right;">Base Salary</th>
        <th style="width: 11%; text-align: right;">Prev Balance</th>
        <th style="width: 11%; text-align: right;">Paid This Month</th>
        <th style="width: 11%; text-align: right;">Closing Balance</th>
        <th style="width: 10%; text-align: center;">Status</th>
      </tr>
    `;

    tableRowsHtml = rows.map((r, i) => {
      let badgeClass = 'badge-default';
      if (r.payment_status === 'Paid') badgeClass = 'badge-green';
      else if (r.payment_status === 'Partial Paid') badgeClass = 'badge-amber';
      else if (r.payment_status === 'Advance') badgeClass = 'badge-blue';
      else if (r.payment_status === 'Unpaid') badgeClass = 'badge-red';

      return `
        <tr class="${i % 2 === 0 ? 'bg-even' : 'bg-odd'}">
          <td style="text-align: center; font-weight: bold; color: #64748b;">${i + 1}</td>
          <td style="font-family: monospace; font-weight: 700; color: #1e293b;">${escapeHtml(r.employee_code || `EMP-${r.id}`)}</td>
          <td style="font-weight: 700; color: #0f172a;">${escapeHtml(r.employee_name || r.full_name)}</td>
          <td>${escapeHtml(r.department || '-')} / ${escapeHtml(r.position || '-')}</td>
          <td style="text-align: right; font-family: monospace; font-weight: 600;">
            ${escapeHtml(formatCurrency(r.monthly_salary, r.currency || currencyCode))}
          </td>
          <td style="text-align: right; font-family: monospace; font-weight: 600; color: #64748b;">
            ${escapeHtml(formatCurrency(r.previous_carry_forward_balance || 0, r.currency || currencyCode))}
          </td>
          <td style="text-align: right; font-family: monospace; font-weight: 700; color: #16a34a;">
            ${escapeHtml(formatCurrency(r.paid_salary, r.currency || currencyCode))}
          </td>
          <td style="text-align: right; font-family: monospace; font-weight: 800; color: ${Number(r.remaining_salary) > 0 ? '#d97706' : '#16a34a'};">
            ${escapeHtml(formatCurrency(r.remaining_salary, r.currency || currencyCode))}
          </td>
          <td style="text-align: center;">
            <span class="badge ${badgeClass}">${escapeHtml(r.payment_status || 'Unpaid')}</span>
          </td>
        </tr>
      `;
    }).join('');

    tableFooterHtml = `
      <tr>
        <td colspan="4" style="text-transform: uppercase; font-weight: 800;">Summary Totals (${rows.length} Employees)</td>
        <td style="text-align: right; font-family: monospace; font-weight: 800; color: #2563eb;">
          ${escapeHtml(formatCurrency(rows.reduce((s, r) => s + Number(r.monthly_salary || 0), 0), currencyCode))}
        </td>
        <td style="text-align: right; font-family: monospace; font-weight: 700; color: #64748b;">
          ${escapeHtml(formatCurrency(rows.reduce((s, r) => s + Number(r.previous_carry_forward_balance || 0), 0), currencyCode))}
        </td>
        <td style="text-align: right; font-family: monospace; font-weight: 900; color: #16a34a;">
          ${escapeHtml(formatCurrency(totalPaid, currencyCode))}
        </td>
        <td style="text-align: right; font-family: monospace; font-weight: 900; color: #d97706;">
          ${escapeHtml(formatCurrency(totalRemaining, currencyCode))}
        </td>
        <td></td>
      </tr>
    `;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${docTitle} - ${safeCompName}</title>
  <style>
    @page { size: A4 landscape; margin: 8mm 10mm 10mm 10mm; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } .no-print { display: none !important; } }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; color: #0f172a; background: #fff; font-size: 10px; line-height: 1.4; padding: 6px 10px; }
    .brand-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2.5px solid #2563eb; padding-bottom: 8px; margin-bottom: 10px; }
    .company-info { display: flex; align-items: center; gap: 12px; }
    .company-logo { width: 44px; height: 44px; object-fit: contain; border-radius: 6px; }
    .company-title { font-size: 16px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: -0.2px; }
    .company-sub { font-size: 9px; color: #64748b; font-weight: 600; text-transform: uppercase; }
    .doc-meta { text-align: right; }
    .doc-title { font-size: 14px; font-weight: 800; color: #2563eb; text-transform: uppercase; }
    .doc-subtitle { font-size: 9.5px; color: #475569; font-weight: 600; margin-top: 1px; }
    .doc-date { font-size: 8.5px; color: #64748b; margin-top: 2px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 10px; }
    .kpi-card { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 5px 8px; }
    .kpi-title { font-size: 8px; font-weight: 700; color: #64748b; text-transform: uppercase; }
    .kpi-value { font-size: 13px; font-weight: 800; color: #0f172a; margin-top: 1px; font-family: monospace; }
    .kpi-card.accrued .kpi-value { color: #2563eb; }
    .kpi-card.paid .kpi-value { color: #16a34a; }
    .kpi-card.balance { background: #fffbeb; border-color: #fde68a; }
    .kpi-card.balance .kpi-value { color: #d97706; }
    table.salary-table { width: 100%; border-collapse: collapse; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; }
    table.salary-table th { background: #0f172a; color: #fff; font-size: 8.5px; font-weight: 700; text-transform: uppercase; padding: 5px 6px; text-align: left; }
    table.salary-table td { padding: 4.5px 6px; border-bottom: 1px solid #e2e8f0; font-size: 9px; color: #1e293b; vertical-align: middle; }
    table.salary-table tr.bg-even { background: #fff; }
    table.salary-table tr.bg-odd { background: #f8fafc; }
    table.salary-table tfoot td { background: #f1f5f9; font-weight: 800; border-top: 2px solid #94a3b8; padding: 5px 6px; font-size: 9px; }
    .badge { display: inline-block; padding: 1px 5px; border-radius: 4px; font-size: 7.5px; font-weight: 700; text-transform: uppercase; }
    .badge-blue { background: #dbeafe; color: #1e40af; }
    .badge-green { background: #dcfce7; color: #166534; }
    .badge-amber { background: #fef3c7; color: #92400e; }
    .badge-red { background: #ffe4e6; color: #9f1239; }
    .badge-default { background: #f1f5f9; color: #475569; }
    .footer-section { margin-top: 16px; display: flex; justify-content: space-between; align-items: flex-end; page-break-inside: avoid; }
    .signatures { display: flex; gap: 30px; }
    .sig-box { border-top: 1px solid #94a3b8; width: 120px; padding-top: 3px; text-align: center; font-size: 8px; font-weight: 600; color: #475569; text-transform: uppercase; }
    .statement-footer { text-align: right; font-size: 8px; color: #94a3b8; }
  </style>
</head>
<body>
  <div class="brand-header">
    <div class="company-info">
      ${logoHtml}
      <div>
        <div class="company-title">${safeCompName}</div>
        <div class="company-sub">Payroll Department • راپور میاشتینی معاشات</div>
      </div>
    </div>
    <div class="doc-meta">
      <div class="doc-title">${docTitle}</div>
      <div class="doc-subtitle">${docSubtitle} • ${escapeHtml(monthName)} (${escapeHtml(jalaliPeriod)})</div>
      <div class="doc-date">Generated: ${escapeHtml(printedAt)} • ${escapeHtml(printedAtJalali)}</div>
    </div>
  </div>

  <div class="kpi-grid">
    ${kpiCardsHtml}
  </div>

  <table class="salary-table">
    <thead>
      ${tableHeaderHtml}
    </thead>
    <tbody>
      ${tableRowsHtml.length ? tableRowsHtml : '<tr><td colspan="9" style="text-align:center; padding: 20px;">No records match the selected print filter.</td></tr>'}
    </tbody>
    <tfoot>
      ${tableFooterHtml}
    </tfoot>
  </table>

  <div class="footer-section">
    <div class="signatures">
      <div class="sig-box">Prepared By (ترتیب)</div>
      <div class="sig-box">Checked (بررسی)</div>
      <div class="sig-box">Approved (منظوري)</div>
    </div>
    <div class="statement-footer">
      <div>Computer Generated Official Record • سیستم مالي او محاسبوي</div>
      <div>${safeCompName}</div>
    </div>
  </div>

  <script>
    window.onload = function() {
      window.focus();
      setTimeout(function() { window.print(); }, 250);
    };
  </script>
</body>
</html>`;
}
