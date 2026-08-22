import { lazy, startTransition, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import ReceiptModal from './components/ReceiptModal';
import ConfirmDialog from './components/ConfirmDialog';
import { useToast } from './components/ToastProvider';
import SearchModal from './components/SearchModal';
import CashBook from './pages/CashBook';
import LoginScreen from './pages/LoginScreen';
import SecuritySetup from './pages/SecuritySetup';
import LiquidMobileDashboard from './components/mobile/LiquidMobileDashboard';
import Dashboard from './pages/Dashboard';
import MultiAccountDashboard from './components/MultiAccountDashboard';
import { api, setAuthToken } from './services/api';
import { isLegacyUpdateDateError, withoutTransactionDate } from './services/transactionCompatibility';
import { currency, csvCell, dateLabel, jalaliDateLabel, todayInputValue } from './utils/format';
import { buildPrintReport, reportDateRange, waitForCondition, waitForPrintReady, withTimeout } from './utils/printEngine';
import { buildCashBookRows, CASH_BOOK_PAGE_SIZE, currentMonthDateRange, filterCashBookRows, monthDateRangeForDate, summarizeCashBookRows } from './utils/transactions';
import { employeeSalarySnapshot, salaryMonthStart } from './utils/payroll';
import useDebouncedValue from './hooks/useDebouncedValue';
import { transactionSchema } from './utils/validation';
import { useCompany } from './context/CompanyContext';
import WorkspaceLoader from './components/WorkspaceLoader';

const AccountLedger = lazy(() => import('./pages/AccountLedger'));
const TenantModuleRouter = lazy(() => import('./components/layout/TenantModuleRouter'));
const BawarStarLedger = lazy(() => import('./pages/BawarStarLedger'));
const Accounts = lazy(() => import('./pages/Accounts'));
const Reports = lazy(() => import('./pages/Reports'));
const BackupRestore = lazy(() => import('./pages/BackupRestore'));
const CurrencyConverter = lazy(() => import('./pages/CurrencyConverter'));
const Settings = lazy(() => import('./pages/Settings'));
const EmployeesSalary = lazy(() => import('./pages/EmployeesSalary'));
const EmployeeLedgerPage = lazy(() => import('./pages/EmployeeLedgerPage'));
const PlasticErpDashboard = lazy(() => import('./pages/PlasticErpDashboard'));
const GlassPrintPreview = lazy(() => import('./components/GlassPrintPreview'));


const appTranslations = {
  English: {
    'Preparing secure setup...': 'Preparing secure setup...',
    'Preparing secure login...': 'Preparing secure login...',
    'Loading workspace...': 'Loading workspace...',
    'Loading latest cash book data...': 'Loading latest cash book data...',
    'Loading print studio...': 'Loading print studio...'
  },
  Pashto: {
    'Preparing secure setup...': 'د خوندي تنظیم چمتو کول...',
    'Preparing secure login...': 'د خوندي ننوتلو چمتو کول...',
    'Loading workspace...': 'د کاري ځای پورته کول...',
    'Loading latest cash book data...': 'د نغدو پیسو وروستي معلومات پورته کول...',
    'Loading print studio...': 'د چاپ سټوډیو پورته کول...'
  },
  Dari: {
    'Preparing secure setup...': 'تهیه ترتیب امن...',
    'Preparing secure login...': 'تهیه ورود امن...',
    'Loading workspace...': 'بارگذاری فضای کاری...',
    'Loading latest cash book data...': 'بارگذاری آخرین اطلاعات کتابچه نقدی...',
    'Loading print studio...': 'بارگذاری استودیو چاپ...'
  }
};

const today = todayInputValue();
const activeCashMonthRange = currentMonthDateRange();

function persistCurrentUser(user) {
  try {
    localStorage.removeItem('cashbook-current-user');
    if (!user) return;
    const compactUser = {
      id: user.id,
      full_name: user.full_name,
      username: user.username,
      role: user.role,
      is_active: user.is_active,
      must_change_password: user.must_change_password,
      last_login: user.last_login,
      avatar_path: user.avatar_path && !String(user.avatar_path).startsWith('data:') && String(user.avatar_path).length < 2048
        ? user.avatar_path
        : ''
    };
    localStorage.setItem('cashbook-current-user', JSON.stringify(compactUser));
  } catch {
    localStorage.removeItem('cashbook-current-user');
  }
}

const emptyCashForm = (type) => ({
  date: today,
  account_id: null,
  employee_id: null,
  salary_month: salaryMonthStart(today),
  payroll_kind: 'salary',
  account_name: '',
  detail: '',
  cash_amount: '',
  usd_amount: '',
  exchange_rate: '64.30',
  category: 'other',
  payment_method: 'cash',
  note: '',
  transaction_type: type,
  editingId: null
});

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToast();

  const activeView = location.pathname === '/' ? 'dashboard' : location.pathname.substring(1);
  const setActiveView = (view) => {
    if (view === 'dashboard') navigate('/');
    else navigate(`/${view}`);
  };

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/cashbook') return 'Cash Book';
    if (path === '/salary') return 'Employees & Salary';
    if (path === '/ledger') return 'Ledger';
    if (path === '/bawar-star') return 'Bawar Star Ledger';
    if (path === '/accounts') return 'Accounts';
    if (path === '/reports') return 'Reports';
    if (path === '/settings') return 'Settings';
    if (path === '/backup') return 'Backup';
    if (path === '/converter') return 'Converter';
    return 'Dashboard';
  };

  const { currentCompany } = useCompany();
  const [theme, setTheme] = useState(() => localStorage.getItem('cashbook-theme') || 'dark');
  const [searchOpen, setSearchOpen] = useState(false);
  const [companyName, setCompanyName] = useState('Cashbook Of All companies');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [companyTaxNumber, setCompanyTaxNumber] = useState('');
  const [companyLogo, setCompanyLogo] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyLicense, setCompanyLicense] = useState('');
  const [currencyCode, setCurrencyCode] = useState('AFN');
  const [exchangeRate, setExchangeRate] = useState('64.30');
  const [printHeader, setPrintHeader] = useState(true);
  const [language, setLanguage] = useState('English');

  const effectiveCompanyName = currentCompany?.name || companyName || 'BAWAR STAR PLASTIC INDUSTRY';
  const effectiveCompanyLogo = currentCompany?.logo || companyLogo || '';
  const effectiveCompanyPhone = companyPhone || '+93 700 345 630';
  const effectiveCompanyEmail = currentCompany?.id === 'sky-ariana'
    ? 'INFO@SKYARIANA.COM'
    : companyEmail || 'INFO@BAWARSTAR.COM';
  const t = (key) => {
    const lang = language || 'English';
    const safeLang = ['English', 'Dari', 'Pashto'].includes(lang) ? lang : 'English';
    const dict = appTranslations[safeLang];
    if (dict && Object.prototype.hasOwnProperty.call(dict, key)) {
      return Reflect.get(dict, key);
    }
    const defaultDict = appTranslations['English'];
    if (defaultDict && Object.prototype.hasOwnProperty.call(defaultDict, key)) {
      return Reflect.get(defaultDict, key);
    }
    return key;
  };
  const [dateDisplayFormat, setDateDisplayFormat] = useState('dual');
  const [printFooterText, setPrintFooterText] = useState('Prepared by Cashbook Of All companies');
  const [autoLogoutMinutes, setAutoLogoutMinutes] = useState(30);
  const [summary, setSummary] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_summary');
      return cached ? JSON.parse(cached) : { cash_in_afn: 0, cash_out_afn: 0, afn_balance: 0, usd_in: 0, usd_out: 0, usd_balance: 0, today_transactions: 0, monthly_transactions: 0 };
    } catch {
      return { cash_in_afn: 0, cash_out_afn: 0, afn_balance: 0, usd_in: 0, usd_out: 0, usd_balance: 0, today_transactions: 0, monthly_transactions: 0 };
    }
  });
  const [transactions, setTransactions] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_transactions');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [accounts, setAccounts] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_accounts');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [employees, setEmployees] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_employees');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [ledger, setLedger] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [cashSearch, setCashSearch] = useState('');
  const [cashStartDate, setCashStartDate] = useState(activeCashMonthRange.startDate);
  const [cashEndDate, setCashEndDate] = useState(activeCashMonthRange.endDate);
  const [cashTypeFilter, setCashTypeFilter] = useState('all');
  const [cashCategoryFilter, setCashCategoryFilter] = useState('all');
  const [cashPaymentFilter, setCashPaymentFilter] = useState('all');
  const [cashAccountFilter, setCashAccountFilter] = useState('');
  const [cashPage, setCashPage] = useState(1);
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [accountName, setAccountName] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  const [accountSearch, setAccountSearch] = useState('');
  const [accountForm, setAccountForm] = useState({ id: null, name: '', account_type: 'customer', phone: '', address: '', opening_balance_afn: '', opening_balance_usd: '', note: '' });
  const [reportMode, setReportMode] = useState('daily');
  const [reportStartDate, setReportStartDate] = useState(today);
  const [reportEndDate, setReportEndDate] = useState(today);
  const [reportData, setReportData] = useState(null);
  const [converterDirection, setConverterDirection] = useState('afnToUsd');
  const [converterAmount, setConverterAmount] = useState('');
  const [converterRate, setConverterRate] = useState('64.30');
  const [converterResult, setConverterResult] = useState('');
  const [cashInForm, setCashInForm] = useState(emptyCashForm('cash_in'));
  const [cashOutForm, setCashOutForm] = useState(emptyCashForm('cash_out'));
  const [cashInMessage, setCashInMessage] = useState('');
  const [cashOutMessage, setCashOutMessage] = useState('');
  const [transactionSavingType, setTransactionSavingType] = useState('');
  const [tableFullscreen, setTableFullscreen] = useState(false);
  const [activeTransactionType, setActiveTransactionType] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false);
  const [printReport, setPrintReport] = useState(null);
  const [printStatus, setPrintStatus] = useState('idle');
  const [printError, setPrintError] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [settingsStatus, setSettingsStatus] = useState('');
  const [lastBackupAt, setLastBackupAt] = useState(() => localStorage.getItem('cashbook-last-backup-at') || '');
  const [loginBg, setLoginBg] = useState(() => localStorage.getItem('cashbook-login-bg') || 'gold_luxury');
  const [customLoginBgUrl, setCustomLoginBgUrl] = useState(() => localStorage.getItem('cashbook-custom-login-bg-url') || '');
  const [isLoading, setIsLoading] = useState(() => {
    try {
      const cached = localStorage.getItem('cached_summary') || localStorage.getItem('cached_transactions');
      return !cached;
    } catch {
      return false;
    }
  });
  const [pageError, setPageError] = useState('');
  const [isLocked, setIsLocked] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const cached = localStorage.getItem('cashbook-current-user');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [loginUsers, setLoginUsers] = useState([]);
  const [managedUsers, setManagedUsers] = useState([]);
  const [authLoading, setAuthLoading] = useState(() => !localStorage.getItem('cashbook-current-user'));
  const [setupRequired, setSetupRequired] = useState(false);
  const [passwordChangeRequired, setPasswordChangeRequired] = useState(false);
  const [diagnostics, setDiagnostics] = useState(null);
  const lastActivityRef = useRef(Date.now());
  const fileRef = useRef(null);
  const csvFileRef = useRef(null);
  const tableRef = useRef(null);
  const printDocumentRef = useRef(null);
  const isLoadingRef = useRef(isLoading);
  const printContextRef = useRef(null);

  useEffect(() => {
    const isDark = theme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.classList.toggle('light', !isDark);
    document.documentElement.setAttribute('data-theme', theme);
    document.body.classList.toggle('dark', isDark);
    document.body.classList.toggle('light', !isDark);
    localStorage.setItem('cashbook-theme', theme);
  }, [theme]);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    initializeAuth();
  }, []);

  useEffect(() => {
    if (currentCompany) {
      setCompanyName(currentCompany.name);
      setCurrencyCode(currentCompany.currency || 'AFN');
      setCompanyLogo(currentCompany.logo || '');
    }
  }, [currentCompany]);

  useEffect(() => {
    if (currentUser && !passwordChangeRequired) loadAll();
    if (currentUser?.role === 'Administrator' && !passwordChangeRequired) reloadManagedUsers();
  }, [currentUser, passwordChangeRequired, currentCompany?.id]);

  useEffect(() => {
    if (currentUser && activeView === 'settings') refreshDiagnostics();
  }, [activeView, currentUser]);

  useEffect(() => {
    if (activeTransactionType !== null) {
      setActiveView('cashbook');
    }
  }, [activeTransactionType]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (activeView !== 'cashbook') {
      setActiveTransactionType(null);
    }
  }, [activeView]);

  useEffect(() => {
    if (!currentUser) return undefined;
    const markActivity = () => {
      lastActivityRef.current = Date.now();
    };
    const events = ['mousemove', 'keydown', 'click', 'scroll'];
    events.forEach((event) => window.addEventListener(event, markActivity, { passive: true }));
    return () => events.forEach((event) => window.removeEventListener(event, markActivity));
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || !autoLogoutMinutes) return undefined;
    const timer = window.setInterval(() => {
      if (Date.now() - lastActivityRef.current > Number(autoLogoutMinutes) * 60 * 1000) {
        setIsLocked(true);
      }
    }, 30000);
    return () => window.clearInterval(timer);
  }, [currentUser, autoLogoutMinutes]);

  useEffect(() => {
    const handleFullscreen = () => setTableFullscreen(document.fullscreenElement === tableRef.current || tableRef.current?.classList.contains('fullscreen-fallback'));
    document.addEventListener('fullscreenchange', handleFullscreen);
    return () => document.removeEventListener('fullscreenchange', handleFullscreen);
  }, []);

  useEffect(() => {
    const rate = Number(converterRate || exchangeRate || 0);
    const amount = Number(converterAmount || 0);
    if (!rate) {
      setConverterResult('Enter an exchange rate greater than zero.');
      return;
    }
    if (converterDirection === 'afnToUsd') {
      setConverterResult(`${currency(amount)} / ${rate} = ${currency(amount / rate, 'USD')}`);
      return;
    }
    setConverterResult(`${currency(amount, 'USD')} x ${rate} = ${currency(amount * rate)}`);
  }, [converterAmount, converterDirection, converterRate, exchangeRate]);

  async function loadAll() {
    const hasCachedData = Boolean(summary?.today_transactions || summary?.total_transactions || transactions.length > 0);
    if (!hasCachedData) {
      setIsLoading(true);
    }
    setPageError('');
    try {
      const [summaryData, transactionData, accountData, employeeData, settingsData] = await Promise.all([
        api.getSummary(),
        api.getTransactions(),
        api.getAccounts(),
        api.getEmployees(),
        api.getSettings()
      ]);
      setSummary(summaryData);
      setTransactions(transactionData);
      setAccounts(accountData);
      setEmployees(employeeData);
      try {
        localStorage.setItem('cached_summary', JSON.stringify(summaryData));
        localStorage.setItem('cached_transactions', JSON.stringify(transactionData));
        localStorage.setItem('cached_accounts', JSON.stringify(accountData));
        localStorage.setItem('cached_employees', JSON.stringify(employeeData));
      } catch {}
      setTheme(settingsData.theme || 'dark');
      setCompanyName(settingsData.company_name || companyName);
      setCompanyPhone(settingsData.company_phone || '');
      setCompanyEmail(settingsData.company_email || '');
      setCompanyWebsite(settingsData.company_website || '');
      setCompanyTaxNumber(settingsData.company_tax_number || '');
      setCompanyLogo(settingsData.company_logo || '');
      setCompanyAddress(settingsData.company_address || '');
      setCompanyLicense(settingsData.company_license || '');
      setCurrencyCode(settingsData.default_currency || 'AFN');
      setLanguage(settingsData.language || 'English');
      setDateDisplayFormat(settingsData.date_display_format || 'dual');
      setPrintFooterText(settingsData.print_footer_text || '');
      setAutoLogoutMinutes(settingsData.auto_logout_minutes || 30);
      setExchangeRate(String(settingsData.default_exchange_rate || exchangeRate));
      setConverterRate(String(settingsData.default_exchange_rate || exchangeRate));
      if (accountData.length && !selectedAccount) {
        await onSelectAccount(accountData[0]);
      } else if (!accountData.length) {
        setSelectedAccount(null);
        setLedger(null);
      }
    } catch (error) {
      if (!hasCachedData) setPageError(error.message);
      showToast(error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  }



  useEffect(() => {
    const handleUnauthorized = () => {
      setAuthToken('');
      try {
        localStorage.removeItem('cashbook-session-token');
        localStorage.removeItem('cashbook-current-user');
      } catch {}
      setCurrentUser(null);
      setPasswordChangeRequired(false);
      setIsLoading(false);
    };

    const handleCompanySwitched = () => {
      // Clear frontend cached state before reloading for newly active tenant
      setSummary({ total_cash_in: 0, total_cash_out: 0, afn_balance: 0 });
      setTransactions([]);
      setAccounts([]);
      setEmployees([]);
      setSelectedAccount(null);
      setLedger(null);
      loadAll();
    };

    const handleGlobalKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setGlobalSearchOpen((prev) => !prev);
      }
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    window.addEventListener('company_switched', handleCompanySwitched);
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
      window.removeEventListener('company_switched', handleCompanySwitched);
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, []);

  async function initializeAuth() {
    setPageError('');
    try {
      const token = localStorage.getItem('cashbook-session-token');
      if (token) {
        setAuthToken(token);
      }
      
      const status = await api.getAuthStatus().catch(() => null);
      if (status) {
        setLoginUsers(status.users || []);
        setSetupRequired(Boolean(status.setup_required));
      }
      
      if (token) {
        try {
          const user = await api.getMe();
          setCurrentUser(user);
          setPasswordChangeRequired(Boolean(user.must_change_password));
          persistCurrentUser(user);
        } catch (meErr) {
          if (meErr.message && (meErr.message.includes('401') || meErr.message.includes('Could not validate credentials'))) {
            setAuthToken('');
            localStorage.removeItem('cashbook-session-token');
            localStorage.removeItem('cashbook-current-user');
            setCurrentUser(null);
            setPasswordChangeRequired(false);
            setPageError('Session expired. Please enter your credentials to log in.');
          }
          // Network errors or offline mode keep cached currentUser intact!
        }
      } else {
        setAuthToken('');
        localStorage.removeItem('cashbook-current-user');
        setCurrentUser(null);
        setPasswordChangeRequired(false);
      }
    } catch (error) {
      if (error.message && (error.message.includes('401') || error.message.includes('Could not validate credentials'))) {
        setAuthToken('');
        localStorage.removeItem('cashbook-session-token');
        localStorage.removeItem('cashbook-current-user');
        setCurrentUser(null);
        setPasswordChangeRequired(false);
        setPageError('Session expired. Please enter your credentials to log in.');
      }
    } finally {
      setAuthLoading(false);
    }
  }

  async function onLogin(payload) {
    const response = payload._neonAuthResponse
      ? payload._neonAuthResponse
      : await api.login(payload);
    setPageError('');
    setAuthToken(response.token);
    setCurrentUser(response.user);
    setPasswordChangeRequired(Boolean(response.must_change_password || response.user?.must_change_password));
    persistCurrentUser(response.user);
    try {
      if (payload.remember_user) localStorage.setItem('cashbook-remembered-user', response.user.username);
      else localStorage.removeItem('cashbook-remembered-user');
    } catch {
      localStorage.removeItem('cashbook-remembered-user');
    }
    lastActivityRef.current = Date.now();
    showToast('Login successful.', 'success');
  }

  async function onSetupOwner(payload) {
    const response = await api.setupOwner(payload);
    setAuthToken(response.token);
    setCurrentUser(response.user);
    setSetupRequired(false);
    setPasswordChangeRequired(false);
    persistCurrentUser(response.user);
    lastActivityRef.current = Date.now();
    showToast('Administrator account created.', 'success');
  }

  async function onChangePassword(payload) {
    const user = await api.changePassword(payload);
    setCurrentUser(user);
    setPasswordChangeRequired(false);
    persistCurrentUser(user);
    lastActivityRef.current = Date.now();
    showToast('Password changed successfully.', 'success');
  }

  async function onLogout(message = 'Logged out.') {
    try {
      await api.logout();
    } catch {
    }
    setAuthToken('');
    localStorage.removeItem('cashbook-current-user');
    setCurrentUser(null);
    setPasswordChangeRequired(false);
    await initializeAuth();
    showToast(message, 'success');
  }

  async function reloadManagedUsers() {
    if (currentUser?.role !== 'Administrator') return;
    const users = await api.getUsers();
    setManagedUsers(users);
    setLoginUsers(users.filter((user) => user.is_active));
  }

  function normalizeAccountName(name) {
    return name.trim();
  }

  function buildTransactionPayload(form, type) {
    const afn = Number(form.cash_amount || 0);
    const usd = Number(form.usd_amount || 0);
    const rate = Number(form.exchange_rate || exchangeRate || 0);
    const derivedAfN = afn > 0 ? afn : usd > 0 && rate > 0 ? Number((usd * rate).toFixed(2)) : 0;
    const derivedUsd = usd > 0 ? usd : afn > 0 && rate > 0 ? Number((afn / rate).toFixed(2)) : 0;
    const accountName = normalizeAccountName(form.account_name) || form.detail.trim() || 'General Account';
    const matchingSelectedAccount = selectedAccount?.name?.toLowerCase() === accountName.toLowerCase();
    return {
      date: form.date,
      account_id: form.account_id || (matchingSelectedAccount ? selectedAccount.id : null),
      employee_id: form.employee_id || null,
      salary_month: form.employee_id && form.salary_month ? form.salary_month : null,
      payroll_kind: form.employee_id ? (form.payroll_kind || 'salary') : null,
      account_name: accountName,
      detail: form.detail.trim() || accountName || (type === 'cash_in' ? 'Cash In' : 'Cash Out'),
      transaction_type: type,
      cash_in_afn: type === 'cash_in' ? derivedAfN : 0,
      cash_out_afn: type === 'cash_out' ? derivedAfN : 0,
      usd_in: type === 'cash_in' ? derivedUsd : 0,
      usd_out: type === 'cash_out' ? derivedUsd : 0,
      exchange_rate: rate,
      converted_afn: derivedAfN,
      category: form.category,
      payment_method: form.payment_method,
      note: form.note.trim()
    };
  }

  async function submitTransaction(form, type) {
    const validation = transactionSchema.validate(form, type);
    if (!validation.isValid) {
      const errorMsg = Object.values(validation.errors)[0];
      return errorMsg;
    }
    try {
      setTransactionSavingType(type);
      const payload = buildTransactionPayload(form, type);
      const accountAlreadyLoaded = accounts.some((account) => account.name.toLowerCase() === payload.account_name.toLowerCase());
      let savedTransaction;
      if (form.editingId) {
        try {
          savedTransaction = await api.updateTransaction(form.editingId, payload);
        } catch (error) {
          if (!isLegacyUpdateDateError(error)) throw error;
          savedTransaction = await api.updateTransaction(form.editingId, withoutTransactionDate(payload));
        }
      } else {
        savedTransaction = await api.createTransaction(payload);
      }
      setTransactions((current) => form.editingId
        ? current.map((transaction) => transaction.id === savedTransaction.id ? savedTransaction : transaction)
        : [...current, savedTransaction]);
      const [nextSummary, nextAccounts] = await Promise.all([
        api.getSummary(),
        accountAlreadyLoaded ? Promise.resolve(null) : api.getAccounts()
      ]);
      setSummary(nextSummary);
      if (nextAccounts) setAccounts(nextAccounts);
      return 'Saved successfully.';
    } catch (error) {
      return error.message;
    } finally {
      setTransactionSavingType('');
    }
  }

  async function onCashInSubmit(event) {
    event.preventDefault();
    const message = await submitTransaction(cashInForm, 'cash_in');
    setCashInMessage(message);
    if (message.includes('Saved')) setCashInForm(emptyCashForm('cash_in'));
    showToast(message, message.includes('Saved') ? 'success' : 'error');
  }

  async function onCashOutSubmit(event) {
    event.preventDefault();
    const message = await submitTransaction(cashOutForm, 'cash_out');
    setCashOutMessage(message);
    if (message.includes('Saved')) setCashOutForm(emptyCashForm('cash_out'));
    showToast(message, message.includes('Saved') ? 'success' : 'error');
  }

  function onTransactionAccountChange(type, value) {
    const setter = type === 'cash_out' ? setCashOutForm : setCashInForm;
    setter((current) => ({ ...current, account_name: value, account_id: null, employee_id: null }));
  }

  function onTransactionAccountSelect(type, item) {
    const setter = type === 'cash_out' ? setCashOutForm : setCashInForm;
    setter((current) => {
      if (item.kind !== 'employee' || type !== 'cash_out') {
        return {
          ...current,
          account_name: item.name,
          account_id: item.accountId,
          employee_id: null,
          category: current.category
        };
      }
      const employee = item.employee;
      const salaryMonth = salaryMonthStart(current.salary_month || current.date);
      return {
        ...current,
        account_name: employee.full_name,
        account_id: employee.account_id,
        employee_id: employee.id,
        salary_month: salaryMonth,
        payroll_kind: 'salary',
        category: 'salary',
        detail: `Salary Payment - ${employee.full_name}`
      };
    });
  }

  function onEditTransaction(transaction) {
    const common = {
      date: transaction.date,
      account_name: transaction.account_name,
      account_id: transaction.account_id,
      employee_id: transaction.employee_id,
      salary_month: transaction.salary_month || salaryMonthStart(transaction.date),
      payroll_kind: transaction.payroll_kind || 'salary',
      detail: transaction.detail,
      cash_amount: transaction.transaction_type === 'cash_in' ? transaction.cash_in_afn : transaction.cash_out_afn,
      usd_amount: transaction.transaction_type === 'cash_in' ? transaction.usd_in : transaction.usd_out,
      exchange_rate: transaction.exchange_rate,
      category: transaction.category || 'other',
      payment_method: transaction.payment_method || 'cash',
      note: transaction.note,
      editingId: transaction.id
    };
    if (transaction.transaction_type === 'cash_in') {
      setCashInForm({ ...emptyCashForm('cash_in'), ...common, transaction_type: 'cash_in' });
      setCashOutForm(emptyCashForm('cash_out'));
      setCashInMessage('Editing transaction. Save to update it.');
      setActiveTransactionType('cash_in');
    } else {
      setCashOutForm({ ...emptyCashForm('cash_out'), ...common, transaction_type: 'cash_out' });
      setCashInForm(emptyCashForm('cash_in'));
      setCashOutMessage('Editing transaction. Save to update it.');
      setActiveTransactionType('cash_out');
    }
    setActiveView('cashbook');
  }

  async function onCreateAccount(event) {
    event.preventDefault();
    try {
      await api.createAccount({
        name: accountName,
        opening_balance_afn: Number(openingBalance || 0),
        opening_balance_usd: 0
      });
      setAccountName('');
      setOpeningBalance('');
      await loadAll();
      showToast('Account added.', 'success');
    } catch (error) {
      showToast(error.message, 'error');
    }
  }

  async function onSaveSettings() {
    try {
      await api.updateSettings({
        company_name: companyName,
        company_phone: companyPhone,
        company_email: companyEmail,
        company_website: companyWebsite,
        company_tax_number: companyTaxNumber,
        company_logo: companyLogo,
        company_address: companyAddress,
        company_license: companyLicense,
        default_exchange_rate: Number(exchangeRate || 0),
        default_currency: currencyCode,
        theme,
        language,
        date_display_format: dateDisplayFormat,
        print_footer_text: printFooterText,
        auto_logout_minutes: Number(autoLogoutMinutes || 30)
      });
      showToast('Settings saved.', 'success');
    } catch (error) {
      showToast(error.message, 'error');
      throw error;
    }
  }

  async function onBackup() {
    try {
      await api.createBackupSnapshot();
      const payload = await api.exportBackup();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bawar-star-backup-${todayInputValue()}.json`;
      link.click();
      URL.revokeObjectURL(url);
      const stamp = new Date().toLocaleString();
      setLastBackupAt(stamp);
      localStorage.setItem('cashbook-last-backup-at', stamp);
      setSettingsStatus('Cloud snapshot saved and local backup exported.');
      showToast('Cloud and local backups completed.', 'success');
    } catch (error) {
      setSettingsStatus('Backup failed.');
      showToast(error.message, 'error');
    }
  }

  function onImportClick() {
    fileRef.current?.click();
  }

  function onCsvImportClick() {
    csvFileRef.current?.click();
  }

  function onDownloadCsvTemplate() {
    const template = [
      'date,account_name,detail,transaction_type,cash_in_afn,cash_out_afn,usd_in,usd_out,exchange_rate,payment_method,category,note',
      '2026-06-14,Example Customer,Customer payment,cash_in,1000,0,0,0,0,cash,other,Sample row',
      '2026-06-14,Example Supplier,Material purchase,cash_out,0,700,0,0,0,bank,factory_expense,Sample row'
    ].join('\r\n');
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'cashbook-import-template.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  async function onCsvImportFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('CSV file must be 5 MB or smaller.', 'error');
      event.target.value = '';
      return;
    }
    const content = await file.text();
    setConfirm({
      title: 'Import cash book CSV',
      message: `Import transactions from ${file.name}? Exact duplicate rows will be skipped.`,
      onConfirm: async () => {
        try {
          const result = await api.importCashbookCsv(content, file.name);
          await loadAll();
          const summary = `Imported ${result.imported_transactions} transactions, skipped ${result.skipped_duplicates} duplicates, and created ${result.created_accounts} accounts.`;
          setSettingsStatus(summary);
          setConfirm(null);
          showToast(summary, 'success');
        } catch (error) {
          showToast(error.message, 'error');
        }
      }
    });
    event.target.value = '';
  }

  async function onImportFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    let payload;
    try {
      payload = JSON.parse(text);
    } catch {
      showToast('Invalid backup JSON file.', 'error');
      event.target.value = '';
      return;
    }
    setConfirm({
      title: 'Restore backup',
      message: 'This will import the backup and overwrite current local data if you choose replace.',
      onConfirm: async () => {
        try {
          await api.importBackup(payload, true);
          await loadAll();
          const stamp = new Date().toLocaleString();
          setLastBackupAt(stamp);
          localStorage.setItem('cashbook-last-backup-at', stamp);
          setSettingsStatus('Backup restored.');
          setConfirm(null);
          showToast('Backup restored.', 'success');
        } catch (error) {
          showToast(error.message, 'error');
        }
      }
    });
    event.target.value = '';
  }

  async function onClearAll() {
    setConfirm({
      title: 'Clear all data',
      message: 'This will delete all accounts, transactions, and settings from local storage.',
      onConfirm: async () => {
        try {
          await api.clearAll();
          await loadAll();
          setConfirm(null);
          showToast('All data cleared.', 'success');
        } catch (error) {
          showToast(error.message, 'error');
        }
      }
    });
  }

  async function onPrint() {
    setPrintPreviewOpen(true);
    setPrintStatus('loading');
    setPrintError('');

    try {
      if (isLoadingRef.current) {
        await waitForCondition(() => !isLoadingRef.current, { timeoutMs: 60000 });
      }

      let context = printContextRef.current;
      if (!context) throw new Error('Report data is not available yet.');

      if (context.activeView === 'reports') {
        const data = await withTimeout(
          runReport({ throwOnError: true }),
          60000,
          'The report request timed out. Check the backend and try again.'
        );
        context = { ...context, reportData: data };
      }

      if (context.activeView === 'ledger' && context.selectedAccount && !context.ledger) {
        const ledgerData = await withTimeout(
          api.getLedger(context.selectedAccount.id),
          60000,
          'The ledger request timed out. Check the backend and try again.'
        );
        setLedger(ledgerData);
        context = { ...context, ledger: ledgerData };
      }

      const preparedReport = buildPrintReport(context);
      startTransition(() => {
        setPrintReport(preparedReport);
        setPrintStatus('ready');
      });
    } catch (error) {
      setPrintError(error.message || 'Print preview could not be prepared.');
      setPrintStatus('error');
    }
  }

  async function printPreparedDocument() {
    if (printStatus !== 'ready' || !printDocumentRef.current) return;
    setPrintStatus('printing');
    setPrintError('');
    try {
      await waitForPrintReady({ root: printDocumentRef.current, timeoutMs: 4000 });

      const reportTitle = printReport?.title || 'Cash Book Report';
      const printWin = window.open('', '_blank', 'width=1100,height=850');

      if (!printWin) {
        window.print();
        setPrintStatus('ready');
        return;
      }

      const docHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title>${reportTitle}</title>
          <style>
            @page {
              size: A4 landscape;
              margin: 8mm 10mm;
            }
            *, *:before, *:after {
              box-sizing: border-box !important;
              margin: 0;
              padding: 0;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              background: #ffffff !important;
              color: #0f172a !important;
              margin: 0 !important;
              padding: 10px !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .print-document, .print-container {
              width: 100% !important;
              max-width: none !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              box-shadow: none !important;
              border: none !important;
              transform: none !important;
            }
            img, .company-logo img, .print-document-header img, .print-banner img {
              max-height: 48px !important;
              max-width: 140px !important;
              object-fit: contain !important;
              display: inline-block !important;
            }
            .print-document-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #0f172a;
              padding-bottom: 10px;
              margin-bottom: 12px;
            }
            .print-company-strip {
              display: flex;
              justify-content: space-between;
              align-items: center;
              background: #f1f5f9;
              border: 1px solid #cbd5e1;
              padding: 6px 12px;
              border-radius: 6px;
              margin-bottom: 10px;
              font-size: 10pt;
            }
            .print-summary-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 8px;
              margin: 10px 0 14px 0;
            }
            .print-summary-grid > div {
              background: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 6px;
              padding: 8px 10px;
              font-size: 9pt;
            }
            table.print-data-table {
              width: 100% !important;
              border-collapse: collapse !important;
              margin-top: 8px !important;
              font-size: 8.5pt !important;
            }
            table.print-data-table th {
              background-color: #0f172a !important;
              color: #ffffff !important;
              padding: 6px 8px !important;
              font-size: 8pt !important;
              text-transform: uppercase !important;
              border: 1px solid #0f172a !important;
            }
            table.print-data-table td {
              padding: 5px 8px !important;
              border-bottom: 1px solid #e2e8f0 !important;
              border-right: 1px solid #f1f5f9 !important;
            }
            table.print-data-table tr:nth-child(even) td {
              background-color: #f8fafc !important;
            }
            .print-money {
              font-family: ui-monospace, monospace !important;
              text-align: right !important;
              font-weight: 600 !important;
            }
            .income-amount { color: #059669 !important; }
            .expense-amount { color: #dc2626 !important; }
            .print-signature-grid {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 20px;
              text-align: center;
              margin-top: 25px;
              padding-top: 10px;
            }
            .signature-line-placeholder {
              border-top: 1px solid #94a3b8;
              height: 20px;
            }
            .signature-label {
              font-size: 8pt;
              font-weight: 700;
              text-transform: uppercase;
              color: #475467;
            }
            .print-document-footer {
              display: flex;
              justify-content: space-between;
              font-size: 8pt;
              color: #64748b;
              margin-top: 15px;
              border-top: 1px solid #e2e8f0;
              padding-top: 6px;
            }
            .no-print { display: none !important; }
          </style>
        </head>
        <body>
          ${printDocumentRef.current.outerHTML}
        </body>
        </html>
      `;

      printWin.document.write(docHtml);
      printWin.document.close();
      printWin.focus();
      await waitForPrintReady({ root: printWin.document.body, timeoutMs: 3000 });
      printWin.print();
    } catch (error) {
      setPrintError(error.message || 'The print dialog could not be opened.');
      setPrintStatus('error');
      return;
    }
    setPrintStatus('ready');
  }

  async function refreshDiagnostics() {
    setDiagnostics((current) => ({ ...(current || {}), loading: true, error: '' }));
    try {
      const [healthResult, databaseResult, authResult] = await Promise.allSettled([
        api.health(),
        api.healthDatabase(),
        api.healthAuth()
      ]);
      const health = healthResult.status === 'fulfilled' ? healthResult.value : {};
      const database = databaseResult.status === 'fulfilled' ? databaseResult.value : {};
      const auth = authResult.status === 'fulfilled' ? authResult.value : {};
      const failures = [healthResult, databaseResult, authResult]
        .filter((result) => result.status === 'rejected')
        .map((result) => result.reason?.message || 'Request failed');
      const anyReachable = [healthResult, databaseResult, authResult].some((result) => result.status === 'fulfilled');
      setDiagnostics({
        loading: false,
        error: failures.join(' | '),
        health: {
          ...health,
          backend: anyReachable ? (health.backend || 'online') : 'offline',
          status: health.status || health.api || (anyReachable ? 'ok' : 'offline'),
        },
        database,
        auth
      });
    } catch (error) {
      setDiagnostics({
        loading: false,
        error: error.message,
        health: { status: 'offline', backend: 'offline', database: 'offline', auth: 'offline', detail: error.message },
        database: { status: 'offline', database: 'offline' },
        auth: { status: 'offline', auth: 'offline' }
      });
    }
  }

  function onExportCashBook() {
    const rows = cashRows;
    const header = ['SN', 'Date', 'Name', 'Detail', 'Cash In AFN', 'Cash Out AFN', 'Balance', 'USD In', 'USD Out', 'Exchange Rate', 'Note'];
    const csv = [
      header.map(csvCell).join(',')
    ].concat(rows.map((row, index) => [row.isOpeningBalance ? 'BF' : index + 1, row.date, row.account_name, row.detail, row.cash_in_afn, row.cash_out_afn, row.runningBalance, row.usd_in, row.usd_out, row.exchange_rate, row.note].map(csvCell).join(','))).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'cash-book-export.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  function onExportCashBookJson() {
    const blob = new Blob([JSON.stringify(cashRows, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'cash-book-export.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  function onExportLedger() {
    const rows = ledger?.rows || [];
    const blob = new Blob([JSON.stringify({ ledger, rows }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ledger-export.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  function onExportPreviewData() {
    const blob = new Blob([JSON.stringify(printReport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'bawar-star-print-preview-data.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  async function onSaveAccount(event) {
    event.preventDefault();
    const payload = {
      ...accountForm,
      opening_balance_afn: Number(accountForm.opening_balance_afn || 0),
      opening_balance_usd: Number(accountForm.opening_balance_usd || 0)
    };
    delete payload.id;
    try {
      if (accountForm.id) await api.updateAccount(accountForm.id, payload);
      else await api.createAccount(payload);
      setAccountForm({ id: null, name: '', account_type: 'customer', phone: '', address: '', opening_balance_afn: '', opening_balance_usd: '', note: '' });
      await loadAll();
      showToast('Account saved.', 'success');
    } catch (error) {
      showToast(error.message, 'error');
    }
  }

  async function onCreateEmployee(payload) {
    try {
      const employee = await api.createEmployee(payload);
      const nextAccounts = await api.getAccounts();
      setEmployees((current) => [...current, employee].sort((a, b) => a.full_name.localeCompare(b.full_name)));
      setAccounts(nextAccounts);
      showToast('Employee added.', 'success');
      return employee;
    } catch (error) {
      showToast(error.message, 'error');
      throw error;
    }
  }

  async function onUpdateEmployee(id, payload) {
    try {
      const employee = await api.updateEmployee(id, payload);
      const nextAccounts = await api.getAccounts();
      setEmployees((current) => current.map((item) => Number(item.id) === Number(id) ? employee : item).sort((a, b) => a.full_name.localeCompare(b.full_name)));
      setAccounts(nextAccounts);
      showToast('Employee updated.', 'success');
      return employee;
    } catch (error) {
      showToast(error.message, 'error');
      throw error;
    }
  }

  async function onSalaryPaymentSaved() {
    const [nextTransactions, nextSummary] = await Promise.all([
      api.getTransactions(),
      api.getSummary()
    ]);
    setTransactions(nextTransactions);
    setSummary(nextSummary);
  }

  async function onEmployeeSalaryChanged() {
    setEmployees(await api.getEmployees());
  }

  async function onEmployeeAvatarChanged(employee) {
    setEmployees((current) => current.map((item) => Number(item.id) === Number(employee.id) ? employee : item));
    showToast('Employee picture updated.', 'success');
  }

  async function onEmployeeDeleted() {
    await loadAll();
    showToast('Employee deleted.', 'success');
  }

  function onDeleteAccount(account) {
    setConfirm({
      title: 'Delete account',
      message: `Delete ${account.name} and its linked transactions?`,
      onConfirm: async () => {
        try {
          await api.deleteAccount(account.id);
          setConfirm(null);
          await loadAll();
          showToast('Account deleted.', 'success');
        } catch (error) {
          showToast(error.message, 'error');
        }
      }
    });
  }

  async function runReport({ throwOnError = false } = {}) {
    try {
      let data;
      if (reportMode === 'daily' || reportMode === 'monthly') {
        const range = reportDateRange(reportMode);
        data = await api.getDateRangeReport(range.start, range.end);
      }
      else if (reportMode === 'expenses') data = await api.getExpenseReport();
      else data = await api.getDateRangeReport(reportStartDate, reportEndDate);
      setReportData(data);
      showToast('Report generated.', 'success');
      return data;
    } catch (error) {
      showToast(error.message, 'error');
      if (throwOnError) throw error;
      return null;
    }
  }

  async function onSelectAccount(account) {
    try {
      setSelectedAccount(account);
      setLedger(null);
      const ledgerData = await api.getLedger(account.id);
      setLedger(ledgerData);
    } catch (error) {
      showToast(error.message, 'error');
    }
  }

  function setCashMonthFromDate(dateValue) {
    const range = monthDateRangeForDate(dateValue);
    setCashStartDate(range.startDate);
    setCashEndDate(range.endDate);
  }

  const latestTransactions = useMemo(() => [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6), [transactions]);
  const deferredCashSearch = useDebouncedValue(cashSearch);
  const deferredCashAccountFilter = useDebouncedValue(cashAccountFilter);
  const cashRowsWithBalances = useMemo(() => buildCashBookRows(transactions), [transactions]);
  const cashRows = useMemo(() => filterCashBookRows(cashRowsWithBalances, {
    search: deferredCashSearch,
    account: deferredCashAccountFilter,
    startDate: cashStartDate,
    endDate: cashEndDate,
    type: cashTypeFilter,
    category: cashCategoryFilter,
    payment: cashPaymentFilter
  }), [cashRowsWithBalances, deferredCashSearch, deferredCashAccountFilter, cashStartDate, cashEndDate, cashTypeFilter, cashCategoryFilter, cashPaymentFilter]);
  const cashTotals = useMemo(() => summarizeCashBookRows(cashRows), [cashRows]);
  const selectedCashOutEmployee = useMemo(
    () => employees.find((employee) => Number(employee.id) === Number(cashOutForm.employee_id)) || null,
    [employees, cashOutForm.employee_id]
  );
  const selectedEmployeeSalary = useMemo(
    () => employeeSalarySnapshot(selectedCashOutEmployee, transactions, cashOutForm.salary_month || cashOutForm.date),
    [selectedCashOutEmployee, transactions, cashOutForm.salary_month, cashOutForm.date]
  );
  const cashPageCount = Math.max(1, Math.ceil(cashRows.length / CASH_BOOK_PAGE_SIZE));
  const cashPageStart = (cashPage - 1) * CASH_BOOK_PAGE_SIZE;
  const visibleCashRows = useMemo(
    () => cashRows.slice(cashPageStart, cashPageStart + CASH_BOOK_PAGE_SIZE),
    [cashRows, cashPageStart]
  );

  useEffect(() => {
    setCashPage(1);
  }, [deferredCashSearch, deferredCashAccountFilter, cashStartDate, cashEndDate, cashTypeFilter, cashCategoryFilter, cashPaymentFilter]);

  useEffect(() => {
    if (cashPage > cashPageCount) setCashPage(cashPageCount);
  }, [cashPage, cashPageCount]);

  const ledgerRows = ledger?.rows || [];
  const ledgerSummary = ledger ? {
    opening: currency(ledger.opening_balance_afn),
    debit: currency(ledger.total_cash_out_afn),
    credit: currency(ledger.total_cash_in_afn),
    final: currency(ledger.final_balance_afn)
  } : { opening: currency(0), debit: currency(0), credit: currency(0), final: currency(0) };
  printContextRef.current = {
    activeView,
    company: {
      companyName: effectiveCompanyName,
      companyLogo: effectiveCompanyLogo,
      companyAddress,
      companyPhone: effectiveCompanyPhone,
      companyEmail: effectiveCompanyEmail,
    },
    preparedBy: currentUser?.full_name || 'System User',
    dateDisplayFormat,
    summary,
    latestTransactions,
    cashRows,
    cashTotals,
    ledger,
    selectedAccount,
    reportMode,
    reportData
  };

  const printReceipt = async () => {
    if (!receipt) return;
    const content = 
      '<!DOCTYPE html><html><head><title>Receipt - ' + (receipt.transaction_no || receipt.id) + '</title><style>' + printStyles() + '</style></head>' +
      '<body>' + receiptHtml(receipt) + '</body></html>';
    const win = window.open('', '_blank', 'width=950,height=800');
    if (!win) {
      showToast('Allow popups to print the receipt.', 'error');
      return;
    }
    win.document.write(content);
    win.document.close();
    win.focus();
    try {
      await waitForPrintReady({
        root: win.document.body,
        documentRef: win.document,
        requestFrame: win.requestAnimationFrame.bind(win),
        timeoutMs: 3000
      });
      win.print();
    } catch (error) {
      showToast(error.message || 'Receipt printing failed.', 'error');
    }
  };

  const printStyles = () => `
    @page {
      size: A4 portrait;
      margin: 0;
    }
    *, *:before, *:after { box-sizing: border-box !important; margin: 0; padding: 0; }
    html, body {
      width: 210mm !important;
      height: 100% !important;
      max-height: 297mm !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: hidden !important;
      background: #fff !important;
      color: #0f172a !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 9px;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    no-print, nav, sidebar, button, .print-hidden, .no-print { display: none !important; }
    .payment-voucher-print, .receipt-print-wrapper, .print-wrapper-2up {
      width: 100% !important;
      max-width: 200mm !important;
      height: 268mm !important;
      max-height: 268mm !important;
      box-sizing: border-box !important;
      overflow: hidden !important;
      margin: 0 auto !important;
      padding: 3mm 4mm !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: space-between !important;
      page-break-before: avoid !important;
      page-break-after: avoid !important;
      page-break-inside: avoid !important;
      break-before: avoid !important;
      break-after: avoid !important;
      break-inside: avoid !important;
    }
    .voucher-card {
      height: 126mm !important;
      max-height: 126mm !important;
      box-sizing: border-box !important;
      overflow: hidden !important;
      border: 1.5px solid #0f172a !important;
      border-radius: 6px !important;
      padding: 8px 12px !important;
      display: flex !important;
      flex-direction: column !important;
      justify-content: space-between !important;
      background: #fff !important;
      position: relative !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
    }
    .voucher-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 4px; margin-bottom: 6px; }
    .company-brand { display: flex; align-items: center; gap: 8px; }
    .company-logo-img { height: 32px; max-width: 90px; object-fit: contain; border-radius: 4px; }
    .company-logo-icon { width: 32px; height: 32px; background: #0f172a; color: #38bdf8; border-radius: 6px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-weight: 900; font-size: 11px; }
    .company-name { font-size: 13px; font-weight: 900; color: #0f172a; letter-spacing: -0.02em; text-transform: uppercase; }
    .company-contact { font-size: 8px; color: #475467; font-weight: 600; margin-top: 1px; }
    .voucher-meta { text-align: right; }
    .copy-badge { display: inline-block; font-size: 7px; font-weight: 800; color: #1e293b; background: #e2e8f0; border: 1px solid #94a3b8; padding: 1px 5px; border-radius: 3px; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 2px; }
    .voucher-title { font-size: 11px; font-weight: 900; color: #1e3a8a; text-transform: uppercase; letter-spacing: -0.01em; margin: 1px 0; }
    .meta-row { font-size: 8.5px; color: #334155; }

    .voucher-body { flex: 1; display: flex; flex-direction: column; gap: 6px; justify-content: space-between; margin-top: 4px; }
    
    .info-grid { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 6px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 8px; }
    .grid-pair { display: flex; flex-direction: column; min-width: 0; }
    .grid-label { font-size: 7px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.04em; margin-bottom: 1px; }
    .grid-value { font-size: 9.5px; color: #0f172a; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .font-bold { font-weight: 700; }
    .font-semibold { font-weight: 600; }
    .uppercase { text-transform: uppercase; }
    .category-tag { color: #2563eb; text-transform: uppercase; }

    .detail-box { background: #fff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 8px; flex: 1; min-height: 38px; }
    .detail-content { font-size: 9.5px; font-weight: 600; color: #1e293b; line-height: 1.35; }

    .amount-highlight-box { display: grid; grid-template-columns: 1fr 1fr 1fr; background: #0f172a; color: #fff; border-radius: 6px; padding: 6px 10px; margin: 2px 0; }
    .amount-col { display: flex; flex-direction: column; }
    .border-left { border-left: 1px solid #334155; padding-left: 10px; }
    .amount-label { font-size: 7px; font-weight: 800; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.05em; }
    .amount-val { font-size: 12.5px; font-weight: 900; font-family: ui-monospace, monospace; margin-top: 1px; }
    .amount-subval { font-size: 10px; font-weight: 800; font-family: ui-monospace, monospace; margin-top: 1px; color: #f1f5f9; }
    .text-emerald { color: #34d399; }
    .text-blue { color: #60a5fa; }

    .verification-strip { display: flex; justify-content: space-between; align-items: center; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 5px; padding: 4px 8px; font-size: 7.5px; color: #475467; margin-top: 2px; }
    .verification-tag { font-weight: 800; color: #059669; text-transform: uppercase; letter-spacing: 0.05em; }

    .note-box { font-size: 8.5px; background: #fffbebf; border: 1px solid #fde68a; border-radius: 5px; padding: 4px 8px; color: #92400e; }
    .note-content { font-weight: 600; }

    .signature-section { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; text-align: center; margin-top: 6px; padding-top: 6px; border-top: 1px dashed #cbd5e1; }
    .signature-block { display: flex; flex-direction: column; align-items: center; }
    .sig-line { width: 100%; border-top: 1px solid #64748b; height: 16px; margin-bottom: 2px; }
    .sig-label { font-size: 8px; font-weight: 800; color: #334155; text-transform: uppercase; letter-spacing: 0.04em; }

    .cut-divider { height: 5mm !important; max-height: 5mm !important; display: flex !important; align-items: center !important; justify-content: center !important; border-bottom: 1.5px dashed #94a3b8 !important; position: relative !important; margin: 1mm 0 !important; flex-shrink: 0 !important; }
    .cut-label { font-size: 6.5px; font-weight: 800; color: #64748b; background: #fff; padding: 0 5px; letter-spacing: 0.08em; text-transform: uppercase; }
  `;

  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const renderSingleVoucher = (tx, copyLabel) => {
    const isCashIn = tx.transaction_type === 'cash_in';
    const afnVal = isCashIn ? tx.cash_in_afn : tx.cash_out_afn;
    const usdVal = isCashIn ? tx.usd_in : tx.usd_out;
    const formattedDate = dateDisplayFormat === 'gregorian' 
      ? dateLabel(tx.date) 
      : dateDisplayFormat === 'persian' 
        ? jalaliDateLabel(tx.date) 
        : `${jalaliDateLabel(tx.date)} | ${dateLabel(tx.date)}`;

    const compInitials = escapeHtml(
      effectiveCompanyName
        .split(' ')
        .filter(Boolean)
        .map(w => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase() || 'BS'
    );

    const logoHtml = effectiveCompanyLogo 
      ? '<img src="' + escapeHtml(effectiveCompanyLogo) + '" alt="Logo" class="company-logo-img" />'
      : '<div class="company-logo-icon font-black text-xs">' + compInitials + '</div>';

    const voucherTitle = isCashIn ? 'RECEIPT VOUCHER' : 'PAYMENT VOUCHER';
    const voucherNo = escapeHtml(tx.transaction_no || String(tx.id).slice(0, 8));
    const safeCompName = escapeHtml(effectiveCompanyName);
    const safeCompPhone = escapeHtml(effectiveCompanyPhone);
    const safeCompEmail = effectiveCompanyEmail ? ' | ' + escapeHtml(effectiveCompanyEmail) : '';
    const safeAccountName = escapeHtml(tx.account_name || 'General Account');
    const safeCategory = escapeHtml(String(tx.category || 'General').replaceAll('_', ' '));
    const safePaymentMethod = escapeHtml(tx.payment_method || 'CASH');
    const safeRef = escapeHtml(tx.reference || '-');
    const safeDetail = escapeHtml(tx.detail || 'Standard cashbook voucher transaction record');
    const safeAfn = escapeHtml(currency(afnVal, 'AFN'));
    const safeUsd = escapeHtml(currency(usdVal, 'USD'));
    const safeExRate = escapeHtml(tx.exchange_rate || '-');
    const safeTxId = escapeHtml(String(tx.id || '-'));
    const safeIssuer = escapeHtml(currentUser?.full_name || 'System Accountant');
    const noteHtml = tx.note ? '<div class="note-box"><span class="grid-label">Remarks / Notes:</span> <span class="note-content">' + escapeHtml(tx.note) + '</span></div>' : '';

    return [
      '<div class="voucher-card">',
      '  <div class="voucher-header">',
      '    <div class="company-brand">',
      '      ' + logoHtml,
      '      <div>',
      '        <h1 class="company-name">' + safeCompName + '</h1>',
      '        <p class="company-contact">' + safeCompPhone + safeCompEmail + '</p>',
      '      </div>',
      '    </div>',
      '    <div class="voucher-meta">',
      '      <div class="copy-badge">' + escapeHtml(copyLabel) + '</div>',
      '      <h2 class="voucher-title">' + voucherTitle + '</h2>',
      '      <div class="meta-row"><strong>Voucher No:</strong> <span class="font-mono">' + voucherNo + '</span></div>',
      '      <div class="meta-row"><strong>Date:</strong> ' + escapeHtml(formattedDate) + '</div>',
      '    </div>',
      '  </div>',
      '  <div class="voucher-body">',
      '    <div class="info-grid">',
      '      <div class="grid-pair">',
      '        <span class="grid-label">Account Name / Party</span>',
      '        <span class="grid-value font-bold">' + safeAccountName + '</span>',
      '      </div>',
      '      <div class="grid-pair">',
      '        <span class="grid-label">Category</span>',
      '        <span class="grid-value font-semibold category-tag">' + safeCategory + '</span>',
      '      </div>',
      '      <div class="grid-pair">',
      '        <span class="grid-label">Payment Method</span>',
      '        <span class="grid-value font-semibold uppercase">' + safePaymentMethod + '</span>',
      '      </div>',
      '      <div class="grid-pair">',
      '        <span class="grid-label">Ref / Doc No</span>',
      '        <span class="grid-value font-mono">' + safeRef + '</span>',
      '      </div>',
      '    </div>',
      '    <div class="detail-box">',
      '      <span class="grid-label">Details / Particulars Description</span>',
      '      <div class="detail-content">' + safeDetail + '</div>',
      '    </div>',
      '    <div class="amount-highlight-box">',
      '      <div class="amount-col">',
      '        <span class="amount-label">AMOUNT AFN</span>',
      '        <strong class="amount-val text-emerald">' + safeAfn + '</strong>',
      '      </div>',
      '      <div class="amount-col border-left">',
      '        <span class="amount-label">AMOUNT USD</span>',
      '        <strong class="amount-val text-blue">' + safeUsd + '</strong>',
      '      </div>',
      '      <div class="amount-col border-left">',
      '        <span class="amount-label">EXCHANGE RATE</span>',
      '        <span class="amount-subval">' + safeExRate + '</span>',
      '      </div>',
      '    </div>',
      '    ' + noteHtml,
      '    <div class="verification-strip">',
      '      <span><strong>System Record ID:</strong> ' + safeTxId + ' | <strong>Issuer:</strong> ' + safeIssuer + '</span>',
      '      <span class="verification-tag">✓ AUDITED & VERIFIED</span>',
      '    </div>',
      '  </div>',
      '  <div class="signature-section">',
      '    <div class="signature-block">',
      '      <div class="sig-line"></div>',
      '      <span class="sig-label">Prepared By</span>',
      '    </div>',
      '    <div class="signature-block">',
      '      <div class="sig-line"></div>',
      '      <span class="sig-label">Receiver Signature</span>',
      '    </div>',
      '    <div class="signature-block">',
      '      <div class="sig-line"></div>',
      '      <span class="sig-label">Authorized Signature</span>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join('\n');
  };

  const receiptHtml = (tx) => `
    <div class="payment-voucher-print print-wrapper-2up receipt-print-wrapper">
      ${renderSingleVoucher(tx, 'OFFICE COPY')}
      <div class="cut-divider">
        <span class="cut-label">✂ CUT ALONG DOTTED LINE FOR CUSTOMER COPY</span>
      </div>
      ${renderSingleVoucher(tx, 'CUSTOMER COPY')}
    </div>
  `;

  function toggleTableFullscreen() {
    const node = tableRef.current;
    if (!node) return;
    if (document.fullscreenElement === node) {
      document.exitFullscreen?.();
      setTableFullscreen(false);
      return;
    }
    if (node.requestFullscreen) {
      node.requestFullscreen();
      setTableFullscreen(true);
      return;
    }
    node.classList.toggle('fullscreen-fallback');
    setTableFullscreen(node.classList.contains('fullscreen-fallback'));
  }

  const accountBalancesMap = useMemo(() => {
    const map = {};
    (accounts || []).forEach((acct) => {
      const openBal = Number(acct.opening_balance_afn || acct.balance || 0);
      if (acct.id !== undefined && acct.id !== null) {
        map[acct.id] = openBal;
      }
      if (acct.name) {
        map[acct.name.trim().toLowerCase()] = openBal;
      }
    });

    (transactions || []).forEach((tx) => {
      const inAmt = Number(tx.cash_in_afn || 0);
      const outAmt = Number(tx.cash_out_afn || 0);
      const isCashIn = tx.transaction_type === 'cash_in' || inAmt > 0;
      const val = isCashIn ? (inAmt || Number(tx.amount || 0)) : -(outAmt || Number(tx.amount || 0));

      if (tx.account_id && map[tx.account_id] !== undefined) {
        map[tx.account_id] += val;
      }
      if (tx.account_name) {
        const key = String(tx.account_name).trim().toLowerCase();
        if (map[key] !== undefined) {
          map[key] += val;
        }
      }
    });

    return map;
  }, [accounts, transactions]);

  const accountsWithCalculatedBalances = useMemo(() => {
    return (accounts || []).map((account) => {
      const computed = accountBalancesMap[account.id] !== undefined 
        ? accountBalancesMap[account.id] 
        : (accountBalancesMap[account.name?.trim().toLowerCase()] !== undefined 
          ? accountBalancesMap[account.name.trim().toLowerCase()] 
          : Number(account.opening_balance_afn || account.balance || 0));

      const isSelected = ledger && selectedAccount?.id === account.id;
      const finalBal = isSelected && ledger.final_balance_afn !== undefined 
        ? Number(ledger.final_balance_afn) 
        : computed;

      return {
        ...account,
        balance: finalBal,
        opening_balance_afn: account.opening_balance_afn ?? 0
      };
    });
  }, [accounts, accountBalancesMap, ledger, selectedAccount]);

  if (authLoading) {
    return (
      <WorkspaceLoader 
        message={t('Loading workspace...')} 
        companyName={companyName} 
        companyLogo={companyLogo} 
        onRetry={initializeAuth} 
      />
    );
  }

  if (setupRequired && !currentUser) {
    return (
      <>
        <SecuritySetup mode="setup" onSetup={onSetupOwner} companyName={companyName} companyLogo={companyLogo} />
        {authLoading && (
          <WorkspaceLoader 
            message={t('Preparing secure setup...')} 
            companyName={companyName} 
            companyLogo={companyLogo} 
            onRetry={initializeAuth} 
          />
        )}
        {pageError && (
          <WorkspaceLoader 
            message={t('Setup Notice')} 
            error={pageError} 
            companyName={companyName} 
            companyLogo={companyLogo} 
            onRetry={initializeAuth} 
          />
        )}
      </>
    );
  }

  if (currentUser && passwordChangeRequired) {
    return (
      <SecuritySetup 
        mode="change" 
        currentUser={currentUser} 
        onChangePassword={onChangePassword} 
        onLogout={onLogout} 
        onSkip={() => setPasswordChangeRequired(false)}
        companyName={companyName} 
        companyLogo={companyLogo} 
      />
    );
  }

  if (!currentUser) {
    return (
      <Routes>
        <Route path="/mobile-liquid" element={<LiquidMobileDashboard />} />
        <Route path="*" element={
          <>
            <LoginScreen
              users={loginUsers}
              rememberedUsername={localStorage.getItem('cashbook-remembered-user') || ''}
              onLogin={onLogin}
              connectionError={pageError}
              isPreparing={authLoading}
              onRetryConnection={initializeAuth}
              companyName={companyName}
              companyLogo={companyLogo}
            />
            {authLoading && (
              <WorkspaceLoader 
                message={t('Preparing secure login...')} 
                companyName={companyName} 
                companyLogo={companyLogo} 
                onRetry={initializeAuth} 
              />
            )}
          </>
        } />
      </Routes>
    );
  }

  return (
    <div className={`app-root relative overflow-hidden ${theme}`}>
      {/* Dynamic Ambient Spheres for Premium Liquid Glass Depth */}
      <div className="fixed top-[-15%] left-[-15%] w-[55vw] h-[55vw] rounded-full bg-gradient-to-br from-blue-500/25 via-emerald-400/20 to-teal-500/20 blur-[130px] pointer-events-none z-0 animate-pulse transition-all duration-1000" />
      <div className="fixed bottom-[-15%] right-[-15%] w-[55vw] h-[55vw] rounded-full bg-gradient-to-tl from-indigo-600/25 via-purple-500/20 to-pink-500/20 blur-[130px] pointer-events-none z-0 animate-pulse transition-all duration-1000" style={{ animationDelay: '2s' }} />
      <div className="fixed top-[25%] left-[35%] w-[45vw] h-[45vw] rounded-full bg-gradient-to-tr from-cyan-400/15 via-blue-600/15 to-violet-500/15 blur-[140px] pointer-events-none z-0 animate-pulse transition-all duration-1000" style={{ animationDelay: '4s' }} />
      
      <div className="relative z-10 w-full h-full">
        <AppShell
          companyName={companyName}
          companyLogo={companyLogo}
          title={getPageTitle()}
          theme={theme}
          onThemeToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          onPrint={onPrint}
          onBackup={onBackup}
          onRestore={onImportClick}
          currentUser={currentUser}
          onLogout={onLogout}
          onSearchClick={() => setSearchOpen(true)}
        >
          <Suspense fallback={<WorkspaceLoader />}>
            <>
              {isLoading && transactions.length === 0 && <div className="loading-strip">{t('Loading latest cash book data...')}</div>}
              {pageError && <div className="error-banner">{pageError}</div>}
              <Routes>
                <Route path="/" element={
                  <Dashboard
                    summary={summary}
                    latestTransactions={latestTransactions}
                    transactions={transactions}
                    onNavigate={setActiveView}
                    onBackup={onBackup}
                    onRestore={onImportClick}
                    onPrint={onPrint}
                    activeTransactionType={activeTransactionType}
                    setActiveTransactionType={setActiveTransactionType}
                    isLoading={isLoading}
                    currentUser={currentUser}
                    companyName={companyName}
                  />
                } />
                <Route path="/cashbook" element={
                  <CashBook
                    summary={summary}
                    transactions={transactions}
                    search={cashSearch}
                    setSearch={setCashSearch}
                    startDate={cashStartDate}
                    setStartDate={setCashMonthFromDate}
                    endDate={cashEndDate}
                    setEndDate={setCashEndDate}
                    typeFilter={cashTypeFilter}
                    setTypeFilter={setCashTypeFilter}
                    categoryFilter={cashCategoryFilter}
                    setCategoryFilter={setCashCategoryFilter}
                    paymentFilter={cashPaymentFilter}
                    setPaymentFilter={setCashPaymentFilter}
                    accountFilter={cashAccountFilter}
                    setAccountFilter={setCashAccountFilter}
                    language={language}
                    onClearFilters={() => {
                      setCashSearch('');
                      setCashStartDate(activeCashMonthRange.startDate);
                      setCashEndDate(activeCashMonthRange.endDate);
                      setCashTypeFilter('all');
                      setCashCategoryFilter('all');
                      setCashPaymentFilter('all');
                      setCashAccountFilter('');
                    }}
                    rows={visibleCashRows}
                    rowOffset={cashPageStart}
                    page={cashPage}
                    pageCount={cashPageCount}
                    totalRows={cashRows.length}
                    onPageChange={setCashPage}
                    totals={{
                      cashIn: currency(cashTotals.cashIn),
                      cashOut: currency(cashTotals.cashOut),
                      usdIn: currency(cashTotals.usdIn, 'USD'),
                      usdOut: currency(cashTotals.usdOut, 'USD')
                    }}
                    cashInForm={cashInForm}
                    setCashInForm={setCashInForm}
                    cashOutForm={cashOutForm}
                    accounts={accounts}
                    employees={employees}
                    selectedEmployee={selectedCashOutEmployee}
                    selectedEmployeeSalary={selectedEmployeeSalary}
                    onCashInAccountChange={(value) => onTransactionAccountChange('cash_in', value)}
                    onCashOutAccountChange={(value) => onTransactionAccountChange('cash_out', value)}
                    onCashInAccountSelect={(item) => onTransactionAccountSelect('cash_in', item)}
                    onCashOutAccountSelect={(item) => onTransactionAccountSelect('cash_out', item)}
                    onQuickAddEmployee={onCreateEmployee}
                    setCashOutForm={setCashOutForm}
                    cashInMessage={cashInMessage}
                    cashOutMessage={cashOutMessage}
                    savingType={transactionSavingType}
                    onCashInSubmit={onCashInSubmit}
                    onCashOutSubmit={onCashOutSubmit}
                    onClearCashIn={() => setCashInForm(emptyCashForm('cash_in'))}
                    onClearCashOut={() => setCashOutForm(emptyCashForm('cash_out'))}
                    onEditTransaction={onEditTransaction}
                    onDeleteTransaction={(id) => setConfirm({
                      title: 'Delete transaction',
                      message: 'This transaction will be permanently deleted.',
                      onConfirm: async () => {
                        try {
                          await api.deleteTransaction(id);
                          setTransactions((current) => current.filter((transaction) => transaction.id !== id));
                          setSummary(await api.getSummary());
                          setConfirm(null);
                          showToast('Transaction deleted.', 'success');
                        } catch (error) {
                          showToast(error.message, 'error');
                        }
                      }
                    })}
                    onReceipt={setReceipt}
                    onToggleFullscreen={toggleTableFullscreen}
                    fullscreen={tableFullscreen}
                    tableRef={tableRef}
                    dateDisplayFormat={dateDisplayFormat}
                    onPrint={onPrint}
                    onExport={onExportCashBook}
                    onExportJson={onExportCashBookJson}
                    activeTransactionType={activeTransactionType}
                    setActiveTransactionType={setActiveTransactionType}
                    isLoading={isLoading}
                  />
                } />
                <Route path="/ledger" element={
                  <TenantModuleRouter
                    accounts={accountsWithCalculatedBalances.filter((account) => !ledgerSearch || account.name.toLowerCase().includes(ledgerSearch.toLowerCase()))}
                    accountName={accountName}
                    setAccountName={setAccountName}
                    openingBalance={openingBalance}
                    setOpeningBalance={setOpeningBalance}
                    search={ledgerSearch}
                    setSearch={setLedgerSearch}
                    onCreateAccount={onCreateAccount}
                    selectedAccountName={selectedAccount?.name}
                    onSelectAccount={onSelectAccount}
                    ledgerTitle={selectedAccount ? `${selectedAccount.name} Ledger` : 'Selected Ledger'}
                    ledgerSummary={ledgerSummary}
                    rows={ledgerRows}
                    dateDisplayFormat={dateDisplayFormat}
                    onReceipt={(tx) => setReceipt(tx)}
                    onPrint={onPrint}
                    onExport={onExportLedger}
                  />
                } />
                <Route path="/bawar-star" element={
                  <BawarStarLedger />
                } />
                <Route path="/accounts" element={
                  <Accounts
                    accounts={accountsWithCalculatedBalances}
                    form={accountForm}
                    setForm={setAccountForm}
                    onSave={onSaveAccount}
                    onEdit={setAccountForm}
                    onDelete={onDeleteAccount}
                    search={accountSearch}
                    setSearch={setAccountSearch}
                  />
                } />
                <Route path="/salary" element={
                  <EmployeesSalary
                    employees={employees}
                    transactions={transactions}
                    onCreateEmployee={onCreateEmployee}
                    onUpdateEmployee={onUpdateEmployee}
                    onOpenCashBook={() => navigate('/cashbook')}
                    onSalaryPaymentSaved={onSalaryPaymentSaved}
                    companyName={companyName}
                    companyLogo={companyLogo}
                    currentUser={currentUser}
                    onEmployeeSalaryChanged={onEmployeeSalaryChanged}
                    onEmployeeAvatarChanged={onEmployeeAvatarChanged}
                    onEmployeeDeleted={onEmployeeDeleted}
                  />
                } />
                <Route path="/employees/:employeeId/ledger" element={
                  <EmployeeLedgerPage
                    currentUser={currentUser}
                    companyName={companyName}
                    companyLogo={companyLogo}
                  />
                } />
                <Route path="/employees" element={<Navigate to="/salary" replace />} />
                <Route path="/reports" element={
                  <Reports
                    transactions={transactions}
                    accounts={accounts}
                    employees={employees}
                    companyName={companyName}
                    companyLogo={companyLogo}
                    companyAddress={companyAddress}
                    companyPhone={companyPhone}
                    companyEmail={companyEmail}
                    currentUser={currentUser}
                    dateDisplayFormat={dateDisplayFormat}
                    currencyCode={currencyCode}
                  />
                } />
                <Route path="/settings" element={
                  <Settings
                    companyName={companyName}
                    setCompanyName={setCompanyName}
                    companyPhone={companyPhone}
                    setCompanyPhone={setCompanyPhone}
                    companyEmail={companyEmail}
                    setCompanyEmail={setCompanyEmail}
                    companyWebsite={companyWebsite}
                    setCompanyWebsite={setCompanyWebsite}
                    companyTaxNumber={companyTaxNumber}
                    setCompanyTaxNumber={setCompanyTaxNumber}
                    companyLogo={companyLogo}
                    setCompanyLogo={setCompanyLogo}
                    companyAddress={companyAddress}
                    setCompanyAddress={setCompanyAddress}
                    companyLicense={companyLicense}
                    setCompanyLicense={setCompanyLicense}
                    currencyCode={currencyCode}
                    setCurrencyCode={setCurrencyCode}
                    exchangeRate={exchangeRate}
                    setExchangeRate={setExchangeRate}
                    theme={theme}
                    setTheme={setTheme}
                    language={language}
                    setLanguage={setLanguage}
                    dateDisplayFormat={dateDisplayFormat}
                    setDateDisplayFormat={setDateDisplayFormat}
                    printFooterText={printFooterText}
                    setPrintFooterText={setPrintFooterText}
                    autoLogoutMinutes={autoLogoutMinutes}
                    setAutoLogoutMinutes={setAutoLogoutMinutes}
                    printHeader={printHeader}
                    setPrintHeader={setPrintHeader}
                    loginBg={loginBg}
                    setLoginBg={setLoginBg}
                    customLoginBgUrl={customLoginBgUrl}
                    setCustomLoginBgUrl={setCustomLoginBgUrl}
                    onSave={onSaveSettings}
                    onPrintPreview={onPrint}
                    onBackup={onBackup}
                    onImportClick={onImportClick}
                    onImportFile={onImportFile}
                    onClear={onClearAll}
                    fileRef={fileRef}
                    status={settingsStatus}
                    setSettingsStatus={setSettingsStatus}
                    lastBackup={lastBackupAt || 'Never'}
                    currentUser={currentUser}
                    users={managedUsers}
                    onReloadUsers={reloadManagedUsers}
                    onCreateUser={async (payload) => {
                      await api.createUser(payload);
                      await reloadManagedUsers();
                      showToast('User added successfully', 'success');
                    }}
                    onUpdateUser={async (id, payload) => {
                      await api.updateUser(id, payload);
                      await reloadManagedUsers();
                      showToast('User updated successfully', 'success');
                    }}
                    onResetUserPassword={async (id, payload) => {
                      const result = await api.resetUserPassword(id, payload);
                      showToast('Password reset.', 'success');
                      return result;
                    }}
                    onDeleteUser={(user) => setConfirm({
                      title: 'Delete user account',
                      message: 'Are you sure you want to delete this account?',
                      onConfirm: async () => {
                        await api.deleteUser(user.id);
                        setConfirm(null);
                        await reloadManagedUsers();
                        showToast('User deleted.', 'success');
                      }
                    })}
                    diagnostics={diagnostics}
                    onRefreshDiagnostics={refreshDiagnostics}
                  />
                } />
                <Route path="/converter" element={
                  <CurrencyConverter
                    direction={converterDirection}
                    setDirection={setConverterDirection}
                    amount={converterAmount}
                    setAmount={setConverterAmount}
                    rate={converterRate}
                    setRate={setConverterRate}
                    result={converterResult}
                    onSaveRate={async () => {
                      setExchangeRate(converterRate);
                      await onSaveSettings();
                      showToast('Default exchange rate saved.', 'success');
                    }}
                  />
                } />
                <Route path="/backup" element={
                  <BackupRestore
                    onBackup={onBackup}
                    onImportClick={onImportClick}
                    onImportFile={onImportFile}
                    onCsvImportClick={onCsvImportClick}
                    onCsvImportFile={onCsvImportFile}
                    onDownloadCsvTemplate={onDownloadCsvTemplate}
                    onExcelSuccess={loadAll}
                    onClear={onClearAll}
                    fileRef={fileRef}
                    csvFileRef={csvFileRef}
                    status={settingsStatus}
                    lastBackup={lastBackupAt || 'Never'}
                  />
                } />
                <Route path="/exports" element={<MultiAccountDashboard />} />
                <Route path="/plastic-erp" element={<PlasticErpDashboard theme={theme} />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>

            </>
          </Suspense>
        </AppShell>
      <ReceiptModal transaction={receipt} companyName={effectiveCompanyName} companyLogo={effectiveCompanyLogo} dateDisplayFormat={dateDisplayFormat} onClose={() => setReceipt(null)} onPrint={printReceipt} />
      {printPreviewOpen && <Suspense fallback={<div className="loading-strip">{t('Loading print studio...')}</div>}><GlassPrintPreview
        open={printPreviewOpen}
        onClose={() => {
          setPrintPreviewOpen(false);
          setPrintStatus('idle');
          setPrintError('');
        }}
        report={printReport}
        onPrint={printPreparedDocument}
        status={printStatus}
        error={printError}
        onRetry={onPrint}
        documentRef={printDocumentRef}
        onThemeToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        onDownloadData={onExportPreviewData}
        onSettings={() => {
          setPrintPreviewOpen(false);
          setActiveView('settings');
        }}
        onLogout={onLogout}
      /></Suspense>}
      <SearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        accounts={accounts}
        transactions={transactions}
        setView={setActiveView}
        setSelectedAccount={setSelectedAccount}
        setCashSearch={setCashSearch}
      />
      <ConfirmDialog open={!!confirm} title={confirm?.title} message={confirm?.message} onCancel={() => setConfirm(null)} onConfirm={confirm?.onConfirm} />
      <Analytics />
      </div>
    </div>
  );
}
