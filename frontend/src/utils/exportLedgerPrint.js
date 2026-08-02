import { resolveAvatarUrl } from './format';

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatUSD(val) {
  if (val === undefined || val === null || isNaN(val)) return '$0.00';
  const isNegative = val < 0;
  const absVal = Math.abs(val).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return isNegative ? `-$${absVal}` : `$${absVal}`;
}

export function generateExportLedgerPrintHtml({
  account,
  transactions = [],
  totals = {},
  companyName = 'SKY ARIANA LTD',
  companyLogo = ''
}) {
  const printedAt = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const clientName = account?.clientName || account?.accountName || 'EXPORT CLIENT';
  const clientNameDari = account?.clientNameDari || account?.accountNameDari || '';
  const licenseNo = account?.licenseNo || '2401-2198';
  const location = account?.location || 'Kandahar, AF | Deira, Dubai';

  const isBawar = companyName.toLowerCase().includes('bawar');
  const companyTagline = isBawar 
    ? 'Plastic Industry & Manufacturing Export Management' 
    : 'International Freight Forwarding & Logistics Management';

  const rows = transactions.map((tx, idx) => {
    const isEven = idx % 2 === 0;
    const creditStr = tx.creditUSD > 0 ? formatUSD(tx.creditUSD) : '-';
    const debitStr = tx.debitUSD > 0 ? formatUSD(tx.debitUSD) : '-';
    const balanceStr = formatUSD(tx.balanceUSD);
    const balanceColor = tx.balanceUSD <= 0 ? 'text-emerald' : 'text-slate';

    const notesHtml = tx.notes ? '<div class="sub-notes dir-rtl">' + escapeHtml(tx.notes) + '</div>' : '';
    const surrenderedHtml = tx.isSurrenderedBL ? '<span class="badge-surrendered">✓ SURRENDERED B/L</span>' : '';

    return [
      '<tr class="' + (isEven ? 'row-even' : 'row-odd') + '">',
      '  <td class="col-sn">' + escapeHtml(tx.sn || idx + 1) + '</td>',
      '  <td class="col-date">' + escapeHtml(tx.date || '-') + '</td>',
      '  <td class="col-text font-bold">' + escapeHtml(tx.shipper || '-') + '</td>',
      '  <td class="col-text">' + escapeHtml(tx.consignee || '-') + '</td>',
      '  <td class="col-text">',
      '    <div class="font-bold">' + escapeHtml(tx.commodityInvoice || '-') + '</div>',
      '    ' + notesHtml,
      '  </td>',
      '  <td class="col-text font-mono">',
      '    <div>' + escapeHtml(tx.blContainer || '-') + '</div>',
      '    ' + surrenderedHtml,
      '  </td>',
      '  <td class="col-qty">' + escapeHtml(tx.quantity > 0 ? tx.quantity : '-') + '</td>',
      '  <td class="col-num text-amber">' + escapeHtml(creditStr) + '</td>',
      '  <td class="col-num text-emerald">' + escapeHtml(debitStr) + '</td>',
      '  <td class="col-num font-bold ' + balanceColor + '">' + escapeHtml(balanceStr) + '</td>',
      '</tr>'
    ].join('\n');
  }).join('');

  // Absolute URL resolution for print window context
  let logoSrc = resolveAvatarUrl(companyLogo);
  if (logoSrc && !logoSrc.startsWith('http') && !logoSrc.startsWith('data:')) {
    logoSrc = window.location.origin + (logoSrc.startsWith('/') ? '' : '/') + logoSrc;
  }

  // SVG Fallback Logo Header
  const svgLogoFallback = '<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="40" height="40" rx="8" fill="#0F172A"/><path d="M12 28L20 12L28 28H23.5L20 20.5L16.5 28H12Z" fill="#38BDF8"/><circle cx="20" cy="14" r="2.5" fill="#F59E0B"/></svg>';

  const logoHtml = logoSrc
    ? '<img src="' + escapeHtml(logoSrc) + '" class="logo-img" alt="Logo" onerror="this.style.display=\'none\'; this.nextElementSibling.style.display=\'flex\';" /><div class="logo-placeholder" style="display:none;">' + svgLogoFallback + '</div>'
    : '<div class="logo-placeholder">' + svgLogoFallback + '</div>';

  const clientSubtitleHtml = clientNameDari
    ? '<small class="dir-rtl">' + escapeHtml(clientNameDari) + '</small>'
    : '<small>Master Export Account</small>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Export Statement - ${escapeHtml(clientName)}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 4mm 6mm;
    }
    @media print {
      html, body {
        width: 100% !important;
        height: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        overflow: hidden !important;
        background: #ffffff !important;
      }
      body {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .no-print { display: none !important; }
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      font-size: 10px;
      line-height: 1.3;
      width: 100%;
    }
    .sheet {
      width: 100%;
      height: 100vh;
      max-height: 100vh;
      margin: 0 auto;
      padding: 0;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
      box-sizing: border-box;
      page-break-after: avoid;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    /* EXECUTIVE HEADER */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2.5px solid #0f172a;
      padding-bottom: 6px;
      margin-bottom: 8px;
    }
    .brand-box {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .logo-img {
      width: 48px;
      height: 48px;
      object-fit: contain;
      border-radius: 8px;
      background: #0f172a;
      padding: 4px;
    }
    .logo-placeholder {
      width: 48px;
      height: 48px;
      border-radius: 8px;
      background: #0f172a;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .brand-title h1 {
      font-size: 22px;
      font-weight: 900;
      letter-spacing: -0.02em;
      text-transform: uppercase;
      color: #0f172a;
      line-height: 1.1;
    }
    .brand-title p {
      font-size: 10px;
      font-weight: 700;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-top: 2px;
    }
    .meta-box {
      text-align: right;
    }
    .meta-badge {
      display: inline-block;
      padding: 3px 10px;
      background: #0f172a;
      color: #ffffff;
      font-size: 10px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      border-radius: 5px;
      margin-bottom: 5px;
    }
    .meta-sub {
      font-size: 9.5px;
      color: #475569;
      font-weight: 600;
      line-height: 1.4;
    }

    /* SUMMARY KPI CARDS */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 10px;
      margin-bottom: 14px;
    }
    .kpi-card {
      background: #f8fafc;
      border: 1.5px solid #cbd5e1;
      border-radius: 10px;
      padding: 8px 12px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.03);
    }
    .kpi-card span {
      display: block;
      font-size: 9px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
    }
    .kpi-card strong {
      display: block;
      font-size: 17px;
      font-weight: 900;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      margin-top: 2px;
      letter-spacing: -0.02em;
    }
    .kpi-card small {
      display: block;
      font-size: 8.5px;
      font-weight: 700;
      color: #475569;
      margin-top: 2px;
    }

    .kpi-amber strong { color: #d97706; }
    .kpi-emerald strong { color: #059669; }
    .kpi-net strong { color: ${totals.netBalance <= 0 ? '#059669' : '#dc2626'}; }
    .kpi-blue strong { color: #2563eb; }

    /* TABLE */
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      table-layout: fixed;
      margin-bottom: 16px;
    }
    thead {
      display: table-header-group;
    }
    th {
      background: #0f172a;
      color: #ffffff;
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 7px 8px;
      border: 1px solid #1e293b;
      text-align: left;
      vertical-align: middle;
      white-space: nowrap;
    }
    th.col-center { text-align: center; }
    th.col-right { text-align: right; }

    td {
      padding: 7px 8px;
      border: 1px solid #cbd5e1;
      vertical-align: middle;
      overflow-wrap: break-word;
      word-break: normal;
    }
    .row-even { background: #ffffff; }
    .row-odd { background: #f8fafc; }

    .col-sn { width: 4%; text-align: center; font-weight: 800; color: #64748b; }
    .col-date { width: 9.5%; text-align: center; font-weight: 700; white-space: nowrap; }
    .col-text { width: 14%; }
    .col-qty { width: 4.5%; text-align: center; font-weight: 800; }
    .col-num { width: 11%; text-align: right; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; white-space: nowrap; font-weight: 700; }

    .font-bold { font-weight: 800; }
    .font-mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .text-amber { color: #d97706; font-weight: 800; }
    .text-emerald { color: #059669; font-weight: 800; }
    .text-slate { color: #0f172a; font-weight: 800; }
    .sub-notes { font-size: 9px; color: #059669; margin-top: 2px; font-weight: 600; }

    .badge-surrendered {
      display: inline-block;
      background: #ecfdf5;
      color: #047857;
      border: 1px solid #a7f3d0;
      font-size: 8px;
      font-weight: 900;
      padding: 2px 5px;
      border-radius: 4px;
      margin-top: 3px;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    tfoot tr {
      background: #0f172a !important;
      color: #ffffff !important;
      font-weight: 900;
    }
    tfoot td {
      border-color: #0f172a;
      padding: 9px 8px;
      font-size: 11px;
    }
    tfoot .col-right {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      text-align: right;
    }

    /* SIGNATURES */
    .signatures {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
      margin-top: 10px;
      margin-bottom: 8px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .sig-block {
      border-top: 1.5px solid #334155;
      padding-top: 4px;
      text-align: center;
    }
    .sig-label {
      font-size: 9px;
      font-weight: 900;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #334155;
    }

    /* FOOTER STRIP */
    .footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1.5px solid #cbd5e1;
      padding-top: 8px;
      font-size: 9px;
      color: #64748b;
      font-weight: 600;
      margin-top: auto;
    }
  </style>
</head>
<body>
  <main class="sheet">
    <div>
      <!-- EXECUTIVE LETTERHEAD HEADER -->
      <header class="header">
        <div class="brand-box">
          ${logoHtml}
          <div class="brand-title">
            <h1>${escapeHtml(companyName)}</h1>
            <p>${escapeHtml(companyTagline)}</p>
          </div>
        </div>
        <div class="meta-box">
          <span class="meta-badge">STATEMENT OF ACCOUNT</span>
          <div class="meta-sub">
            <div><strong>Lic:</strong> ${escapeHtml(licenseNo)} | <strong>Loc:</strong> ${escapeHtml(location)}</div>
            <div><strong>Generated:</strong> ${escapeHtml(printedAt)} | <strong>Currency:</strong> USD ($)</div>
          </div>
        </div>
      </header>

      <!-- CLIENT & FINANCIAL KPI CARDS -->
      <section class="kpi-grid">
        <div class="kpi-card">
          <span>Account Holder / Client</span>
          <strong>${escapeHtml(clientName)}</strong>
          ${clientSubtitleHtml}
        </div>
        <div class="kpi-card kpi-amber">
          <span>Total Invoices (Credit)</span>
          <strong>${formatUSD(totals.totalCredit)}</strong>
          <small>Total Billed Shipments</small>
        </div>
        <div class="kpi-card kpi-emerald">
          <span>Total Payments (Debit)</span>
          <strong>${formatUSD(totals.totalDebit)}</strong>
          <small>Total Received Deposits</small>
        </div>
        <div class="kpi-card kpi-net">
          <span>Net Balance</span>
          <strong>${formatUSD(totals.netBalance)}</strong>
          <small>${totals.netBalance <= 0 ? 'Credit / Paid In Full' : 'Outstanding Debt'}</small>
        </div>
      </section>

      <!-- DATA TABLE -->
      <table>
        <thead>
          <tr>
            <th class="col-center" style="width: 4%;">S.N</th>
            <th style="width: 9.5%;">Date (تاریخ)</th>
            <th style="width: 14%;">Shipper (ارسال کننده)</th>
            <th style="width: 14%;">Consignee (گیرنده)</th>
            <th style="width: 18%;">Commodity &amp; Invoice</th>
            <th style="width: 18%;">B/L &amp; Container No.</th>
            <th class="col-center" style="width: 4.5%;">Qty</th>
            <th class="col-right" style="width: 11%;">Credit ($)</th>
            <th class="col-right" style="width: 11%;">Debit ($)</th>
            <th class="col-right" style="width: 11%;">Balance ($)</th>
          </tr>
        </thead>
        <tbody>
          ${rows.length ? rows : `<tr><td colspan="10" style="text-align:center; padding: 24px; color: #64748b; font-size: 12px;">No export transaction records.</td></tr>`}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="6" style="text-align: right; text-transform: uppercase; font-size: 9.5px; letter-spacing: 0.05em; color: #cbd5e1;">
              TOTALS (${transactions.length} Activity Rows):
            </td>
            <td style="text-align: center; font-family: monospace; color: #60a5fa; font-size: 11px;">${escapeHtml(String(totals.totalContainers || 0))}</td>
            <td class="col-right" style="color: #fbbf24; font-size: 11px;">${formatUSD(totals.totalCredit)}</td>
            <td class="col-right" style="color: #34d399; font-size: 11px;">${formatUSD(totals.totalDebit)}</td>
            <td class="col-right" style="color: ${totals.netBalance <= 0 ? '#34d399' : '#f87171'}; font-size: 11px;">${formatUSD(totals.netBalance)}</td>
          </tr>
        </tfoot>
      </table>
    </div>

    <div>
      <!-- SIGNATURES -->
      <footer class="signatures">
        <div class="sig-block">
          <span class="sig-label">Prepared By (Accountant)</span>
        </div>
        <div class="sig-block">
          <span class="sig-label">Verified By (Finance Manager)</span>
        </div>
        <div class="sig-block">
          <span class="sig-label">Client Acknowledgment &amp; Stamp</span>
        </div>
      </footer>

      <!-- DOCUMENT FOOTER STRIP -->
      <div class="footer">
        <span>Official ${escapeHtml(companyName)} International Freight System • Computer Generated Document</span>
        <span>Page 1 of 1</span>
      </div>
    </div>
  </main>
</body>
</html>`;
}

export function printExportLedgerDocument({ account, transactions, totals, companyName, companyLogo }) {
  const html = generateExportLedgerPrintHtml({ account, transactions, totals, companyName, companyLogo });
  const printWin = window.open('', '_blank', 'width=1150,height=800');
  if (!printWin) {
    alert('Please allow popups to open the print document.');
    return;
  }
  printWin.document.write(html);
  printWin.document.close();
  printWin.focus();
  setTimeout(() => {
    printWin.print();
  }, 350);
}
