export const CASH_BOOK_PAGE_SIZE = 100;

function inputDate(date) {
  const value = new Date(date);
  value.setMinutes(value.getMinutes() - value.getTimezoneOffset());
  return value.toISOString().slice(0, 10);
}

export function roundMoney(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * 100) / 100;
}

export function cashDeltaAfn(transaction) {
  if (!transaction) return 0;
  const isCashIn = transaction.transaction_type === 'cash_in';
  const val = isCashIn ? Number(transaction.cash_in_afn || 0) : Number(transaction.cash_out_afn || 0);
  return isCashIn ? roundMoney(val) : -roundMoney(val);
}

export function cashDeltaUsd(transaction) {
  if (!transaction) return 0;
  const isCashIn = transaction.transaction_type === 'cash_in';
  const val = isCashIn ? Number(transaction.usd_in || 0) : Number(transaction.usd_out || 0);
  return isCashIn ? roundMoney(val) : -roundMoney(val);
}

export function currentMonthDateRange(now = new Date()) {
  const year = now.getFullYear();
  const month = now.getMonth();
  return {
    startDate: inputDate(new Date(year, month, 1)),
    endDate: inputDate(new Date(year, month + 1, 0))
  };
}

export function monthDateRangeForDate(dateValue) {
  if (!dateValue) return currentMonthDateRange();
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return currentMonthDateRange();
  return currentMonthDateRange(date);
}

export function buildBalanceBroughtForwardRow(openingBalanceAfn = 0, openingBalanceUsd = 0, startDate = '') {
  return {
    id: `balance-brought-forward-${startDate || 'all'}`,
    isOpeningBalance: true,
    date: startDate || '',
    transaction_no: 'BF',
    account_name: 'Balance Brought Forward',
    detail: 'Opening balance from previous month closing',
    category: 'opening_balance',
    transaction_type: 'opening_balance',
    payment_method: '',
    cash_in_afn: 0,
    cash_out_afn: 0,
    usd_in: 0,
    usd_out: 0,
    exchange_rate: '',
    note: 'Automatically calculated',
    runningBalance: roundMoney(openingBalanceAfn),
    runningBalanceUsd: roundMoney(openingBalanceUsd),
    searchText: 'balance brought forward opening balance previous month closing',
    accountSearchText: 'balance brought forward'
  };
}

export function buildCashBookRows(transactions) {
  let runningAfn = 0;
  let runningUsd = 0;
  
  return [...transactions]
    .sort((left, right) => String(left.date).localeCompare(String(right.date)) || left.id - right.id)
    .map((transaction) => {
      runningAfn = roundMoney(runningAfn + cashDeltaAfn(transaction));
      runningUsd = roundMoney(runningUsd + cashDeltaUsd(transaction));
      
      return {
        ...transaction,
        runningBalance: runningAfn,
        runningBalanceUsd: runningUsd,
        searchText: `${transaction.account_name || ''} ${transaction.detail || ''} ${transaction.note || ''}`.toLowerCase(),
        accountSearchText: String(transaction.account_name || '').toLowerCase()
      };
    });
}

export function filterCashBookRows(rows, filters) {
  const monthRange = filters.startDate ? monthDateRangeForDate(filters.startDate) : null;
  const startDate = monthRange?.startDate || filters.startDate;
  const endDate = monthRange?.endDate || filters.endDate;
  const search = (filters.search || '').trim().toLowerCase();
  const account = (filters.account || '').trim().toLowerCase();

  const openingAfn = startDate
    ? rows
      .filter((transaction) => transaction.date < startDate)
      .reduce((balance, transaction) => roundMoney(balance + cashDeltaAfn(transaction)), 0)
    : 0;

  const openingUsd = startDate
    ? rows
      .filter((transaction) => transaction.date < startDate)
      .reduce((balance, transaction) => roundMoney(balance + cashDeltaUsd(transaction)), 0)
    : 0;

  let runningAfn = roundMoney(openingAfn);
  let runningUsd = roundMoney(openingUsd);

  const filteredRows = rows.filter((transaction) => (
    (!search || transaction.searchText.includes(search))
    && (!startDate || transaction.date >= startDate)
    && (!endDate || transaction.date <= endDate)
    && (filters.type === 'all' || transaction.transaction_type === filters.type)
    && (filters.category === 'all' || transaction.category === filters.category)
    && (filters.payment === 'all' || transaction.payment_method === filters.payment)
    && (!account || transaction.accountSearchText.includes(account))
  )).map((transaction) => {
    runningAfn = roundMoney(runningAfn + cashDeltaAfn(transaction));
    runningUsd = roundMoney(runningUsd + cashDeltaUsd(transaction));
    return { ...transaction, runningBalance: runningAfn, runningBalanceUsd: runningUsd };
  });

  if (!startDate) return filteredRows;
  return [buildBalanceBroughtForwardRow(openingAfn, openingUsd, startDate), ...filteredRows];
}

export function summarizeCashBookRows(rows) {
  const totals = (rows || []).reduce((acc, transaction) => {
    if (transaction.isOpeningBalance) return acc;
    acc.cashIn = roundMoney(acc.cashIn + Number(transaction.cash_in_afn || 0));
    acc.cashOut = roundMoney(acc.cashOut + Number(transaction.cash_out_afn || 0));
    acc.usdIn = roundMoney(acc.usdIn + Number(transaction.usd_in || 0));
    acc.usdOut = roundMoney(acc.usdOut + Number(transaction.usd_out || 0));
    return acc;
  }, { cashIn: 0, cashOut: 0, usdIn: 0, usdOut: 0 });

  totals.netBalance = roundMoney(totals.cashIn - totals.cashOut);
  totals.netUsdBalance = roundMoney(totals.usdIn - totals.usdOut);
  return totals;
}
