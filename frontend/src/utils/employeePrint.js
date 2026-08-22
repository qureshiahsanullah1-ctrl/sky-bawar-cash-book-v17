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
    @page {
      size: A4 landscape;
      margin: 8mm 12mm 10mm 12mm;
    }
    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .no-print { display: none !important; }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      font-size: 11px;
      line-height: 1.4;
      padding: 10px 15px;
    }

    /* Branding Header */
    .brand-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 14px;
    }
    .company-info { display: flex; align-items: center; gap: 14px; }
    .company-logo { width: 48px; height: 48px; object-fit: contain; border-radius: 6px; }
    .company-title { font-size: 18px; font-weight: 800; color: #0f172a; letter-spacing: -0.3px; text-transform: uppercase; }
    .company-sub { font-size: 10px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }

    .doc-meta { text-align: right; }
    .doc-title { font-size: 16px; font-weight: 800; color: #2563eb; text-transform: uppercase; letter-spacing: -0.2px; }
    .doc-date { font-size: 10px; color: #64748b; margin-top: 2px; }

    /* Employee Profile Bar */
    .profile-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .emp-name { font-size: 15px; font-weight: 700; color: #0f172a; }
    .emp-code { display: inline-block; background: #e2e8f0; color: #334155; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; margin-left: 6px; }
    .emp-details { display: flex; gap: 18px; margin-top: 4px; font-size: 10px; color: #475569; }
    .emp-details span strong { color: #0f172a; }

    /* KPI Summary Cards */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 14px;
    }
    .kpi-card {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 8px 12px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.03);
    }
    .kpi-title { font-size: 9px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
    .kpi-value { font-size: 15px; font-weight: 800; color: #0f172a; margin-top: 2px; font-family: "Courier New", Courier, monospace; }
    .kpi-card.accrued .kpi-value { color: #2563eb; }
    .kpi-card.paid .kpi-value { color: #16a34a; }
    .kpi-card.adj .kpi-value { color: #9333ea; }
    .kpi-card.balance { background: #f0f9ff; border-color: #93c5fd; }
    .kpi-card.balance .kpi-value { color: #1d4ed8; }

    /* Ledger Table */
    table.ledger-table {
      width: 100%;
      border-collapse: collapse;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      overflow: hidden;
    }
    table.ledger-table th {
      background: #0f172a;
      color: #ffffff;
      font-size: 9.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 7px 8px;
      text-align: left;
      border-bottom: 1px solid #0f172a;
    }
    table.ledger-table td {
      padding: 6px 8px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 10px;
      color: #1e293b;
      vertical-align: middle;
    }
    table.ledger-table tr.bg-even { background: #ffffff; }
    table.ledger-table tr.bg-odd { background: #f8fafc; }

    /* Column Widths & Alignment */
    .col-date { width: 11%; font-weight: 600; white-space: nowrap; }
    .col-period { width: 8%; font-family: monospace; color: #64748b; white-space: nowrap; }
    .col-type { width: 11%; white-space: nowrap; }
    .col-desc { width: 20%; font-weight: 500; word-break: break-word; }
    .col-num { width: 9%; text-align: right; font-family: "Courier New", Courier, monospace; font-weight: 600; white-space: nowrap; }
    .col-ref { width: 4%; text-align: center; font-family: monospace; color: #94a3b8; font-size: 9px; }

    .date-greg { font-weight: 700; color: #0f172a; }
    .date-jalali { font-size: 8.5px; color: #4338ca; font-family: monospace; font-weight: 600; margin-top: 1px; }
    .period-jalali { font-size: 8.5px; color: #64748b; margin-top: 1px; }

    .text-blue { color: #2563eb; }
    .text-green { color: #16a34a; }
    .text-teal { color: #0d9488; }
    .text-red { color: #dc2626; }
    .text-amber { color: #d97706; }
    .text-bold { font-weight: 800; color: #0f172a; }
    .text-negative { color: #d97706 !important; }

    /* Badges */
    .badge {
      display: inline-block;
      padding: 1.5px 6px;
      border-radius: 4px;
      font-size: 8.5px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .badge-blue { background: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe; }
    .badge-green { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
    .badge-teal { background: #ccfbf1; color: #115e59; border: 1px solid #99f6e4; }
    .badge-red { background: #ffe4e6; color: #9f1239; border: 1px solid #fecdd3; }
    .badge-amber { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
    .badge-default { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }

    /* Table Footer */
    table.ledger-table tfoot td {
      background: #f1f5f9;
      font-weight: 800;
      border-top: 2px solid #94a3b8;
      border-bottom: none;
      padding: 6px 8px;
    }

    /* Footer & Signatures */
    .footer-section {
      margin-top: 24px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      page-break-inside: avoid;
    }
    .signatures {
      display: flex;
      gap: 40px;
    }
    .sig-box {
      border-top: 1px solid #94a3b8;
      width: 140px;
      padding-top: 4px;
      text-align: center;
      font-size: 9px;
      font-weight: 600;
      color: #475569;
      text-transform: uppercase;
    }
    .statement-footer {
      text-align: right;
      font-size: 9px;
      color: #94a3b8;
    }
  </style>
</head>
<body>

  <!-- Branding Header -->
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

  <!-- Employee Profile -->
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
      <div style="font-size: 10px; color: #64748b;">Statement Currency</div>
      <div style="font-size: 14px; font-weight: 800; color: #0f172a;">${escapeHtml(currency)}</div>
    </div>
  </div>

  <!-- KPI Summary Grid -->
  <div class="kpi-grid">
    <div class="kpi-card accrued">
      <div class="kpi-title">Total Accrued</div>
      <div class="kpi-value">${escapeHtml(totalAccrued)}</div>
    </div>
    <div class="kpi-card paid">
      <div class="kpi-title">Total Paid</div>
      <div class="kpi-value">${escapeHtml(totalPaid)}</div>
    </div>
    <div class="kpi-card adj">
      <div class="kpi-title">Total Adjustments</div>
      <div class="kpi-value">${escapeHtml(totalAdjustments)}</div>
    </div>
    <div class="kpi-card balance">
      <div class="kpi-title">Outstanding Balance</div>
      <div class="kpi-value">${escapeHtml(outstandingBalance)}</div>
    </div>
  </div>

  <!-- Table -->
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
        <td colspan="4" style="text-transform: uppercase; font-size: 9px; letter-spacing: 0.5px;">Summary Totals (${displayEntries.length} entries)</td>
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

  <!-- Signatures & Verification -->
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
      setTimeout(function() {
        window.print();
      }, 250);
    };
  </script>
</body>
</html>`;
}
