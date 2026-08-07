import { formatApiErrorDetail } from './errorFormatting.js';

// We default to relative paths when hosted on Vercel, but use https://cash-book-v11.vercel.app for mobile APKs and all other hosts.
export const getDynamicApiBaseUrl = () => {
  if (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') {
    const customUrl = localStorage.getItem('cashbook_api_url');
    if (customUrl) {
      let trimmed = customUrl.trim().replace(/\/+$/, '');
      if (trimmed && !/^https?:\/\//i.test(trimmed)) {
        trimmed = 'https://' + trimmed;
      }
      if (trimmed.includes('cashbook-v11.vercel.app')) {
        trimmed = 'https://cash-book-v11.vercel.app';
        try { localStorage.setItem('cashbook_api_url', trimmed); } catch {}
      }
      return trimmed;
    }
  }
  if (import.meta.env?.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined') {
    const host = window.location.hostname || '';
    if (host.endsWith('vercel.app')) {
      return import.meta.env?.PROD ? '' : '';
    }
  }
  return 'https://cash-book-v11.vercel.app';
};
export const API_BASE = getDynamicApiBaseUrl();
export const getApiBaseUrl = getDynamicApiBaseUrl;

export function setApiBaseUrl(url) {
  if (typeof localStorage !== 'undefined') {
    if (url) {
      let trimmed = url.trim().replace(/\/+$/, '');
      if (trimmed && !/^https?:\/\//i.test(trimmed)) {
        trimmed = 'https://' + trimmed;
      }
      localStorage.setItem('cashbook_api_url', trimmed);
    } else {
      localStorage.removeItem('cashbook_api_url');
    }
  }
}

export async function testConnection(targetUrl) {
  let base = (targetUrl || getDynamicApiBaseUrl()).trim().replace(/\/+$/, '');
  if (base && !/^https?:\/\//i.test(base)) {
    base = 'https://' + base;
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(`${base}/api/health`, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json, text/plain, */*' }
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      return { ok: false, status: res.status, message: `Server returned HTTP ${res.status}` };
    }
    const data = await res.json();
    return { ok: true, status: 200, data, message: 'Server Connected (Online)' };
  } catch (err) {
    clearTimeout(timeoutId);
    const detail = err.message ? ` (${err.message})` : '';
    return { ok: false, status: 0, message: err.name === 'AbortError' ? 'Connection timed out (12s)' : `Failed to reach server${detail}` };
  }
}

let authToken = typeof localStorage !== 'undefined' && localStorage.getItem ? (localStorage.getItem('cashbook-session-token') || '') : '';

export function setAuthToken(token) {
  authToken = token || '';
  try {
    if (authToken) localStorage.setItem('cashbook-session-token', authToken);
    else localStorage.removeItem('cashbook-session-token');
  } catch {
    localStorage.removeItem('cashbook-current-user');
    try {
      if (authToken) localStorage.setItem('cashbook-session-token', authToken);
      else localStorage.removeItem('cashbook-session-token');
    } catch {
      // Keep the in-memory session usable when persistent storage is unavailable.
    }
  }
}

const apiResponseCache = new Map();
const CACHE_TTL_MS = 60000; // 60s memory TTL for instant 0ms navigation

export function clearApiCache() {
  apiResponseCache.clear();
}

async function request(path, options = {}, retries = 2) {
  let response;
  const method = (options.method || 'GET').toUpperCase();
  const isFormData = options.body instanceof FormData;
  
  const activeTenantId = (() => {
    try {
      return localStorage.getItem('activeTenantId') || localStorage.getItem('cashbook_active_company_id') || 'cashbook_bawar_prod';
    } catch {
      return 'cashbook_bawar_prod';
    }
  })();

  const cacheKey = `${method}:${path}:${activeTenantId}`;
  const storageKey = `cb_swr_${cacheKey.replace(/[^a-zA-Z0-9]/g, '_')}`;

  // If POST/PUT/DELETE/PATCH, invalidate cache
  if (method !== 'GET') {
    apiResponseCache.clear();
  } else if (!options.skipCache) {
    const cached = apiResponseCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
      // Revalidate asynchronously in background
      setTimeout(() => {
        request(path, { ...options, skipCache: true }).catch(() => {});
      }, 100);
      return cached.data;
    }
    // Try localStorage cache for instant initial load
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.data) {
          apiResponseCache.set(cacheKey, { data: parsed.data, timestamp: Date.now() });
          setTimeout(() => {
            request(path, { ...options, skipCache: true }).catch(() => {});
          }, 100);
          return parsed.data;
        }
      }
    } catch {}
  }

  // Clean options so custom keys like skipCache are never passed to native fetch
  const fetchOptions = { ...options };
  delete fetchOptions.skipCache;

  // Add a 90-second timeout to accommodate cloud cold starts and complex report queries
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 90000);

  const currentBase = getDynamicApiBaseUrl();
  try {
    response = await fetch(`${currentBase}${path}`, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json, text/plain, */*',
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(authToken ? { 'X-Session-Token': authToken, 'Authorization': `Bearer ${authToken}` } : {}),
        'X-Tenant-ID': activeTenantId,
        'X-Company-Id': activeTenantId,
        ...(options.headers || {})
      },
      ...fetchOptions
    });
  } catch (error) {
    clearTimeout(timeoutId);
    // If GET request fails and we have cached data, return cached data gracefully
    if (method === 'GET') {
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.data) return parsed.data;
        }
      } catch {}
    }
    const prodFallback = 'https://cash-book-v11.vercel.app';
    if (currentBase !== prodFallback && retries > 0) {
      try {
        localStorage.setItem('cashbook_api_url', prodFallback);
      } catch {}
      return request(path, options, retries - 1);
    }
    if (retries > 0 && error.name !== 'AbortError') {
      await new Promise(r => setTimeout(r, 600));
      return request(path, options, retries - 1);
    }
    if (error.name === 'AbortError') {
      throw new Error('Backend connection timed out. Please retry.');
    }
    throw new Error(`Failed to fetch from backend. Ensure the server is running or click retry.`);
  } finally {
    clearTimeout(timeoutId);
  }
  
  if (!response.ok) {
    if (retries > 0 && method === 'GET' && [502, 503, 504].includes(response.status)) {
      await new Promise(r => setTimeout(r, 600));
      return request(path, options, retries - 1);
    }
    if (response.status === 401) {
      setAuthToken('');
      try {
        localStorage.removeItem('cashbook-session-token');
        localStorage.removeItem('cashbook-current-user');
      } catch {
        // Ignore storage errors
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('auth:unauthorized'));
      }
    }
    const text = await response.text();
    let message = '';
    try {
      const payload = JSON.parse(text);
      const detailStr = formatApiErrorDetail(payload.detail ?? payload.message);
      if (detailStr) {
        message = detailStr.startsWith('Server error') ? detailStr : `Server error (${response.status}): ${detailStr}`;
      } else {
        message = `Server error (${response.status}): ${response.statusText}`;
      }
    } catch {
      if (text.includes('<!doctype') || text.includes('<html')) {
        message = `Server error (${response.status}): HTML Error Page`;
      } else {
        message = `Server error (${response.status}): ${text.substring(0, 150) || response.statusText}`;
      }
    }
    throw new Error(message);
  }
  if (response.status === 204) return null;
  
  // Clone the response so we can read it multiple times if needed
  const responseText = await response.clone().text();
  try {
    const parsedData = JSON.parse(responseText);
    if (method === 'GET') {
      apiResponseCache.set(cacheKey, { timestamp: Date.now(), data: parsedData });
      try {
        localStorage.setItem(storageKey, JSON.stringify({ timestamp: Date.now(), data: parsedData }));
      } catch {}
    }
    return parsedData;
  } catch (error) {
    // If JSON parsing fails, provide helpful error message
    if (responseText.includes('<!doctype') || responseText.includes('<html')) {
      throw new Error(`Server returned HTML error. Status: ${response.status}. Check backend server.`);
    }
    throw new Error(`Failed to parse response as JSON. Status: ${response.status}.`);
  }
}

export const api = {
  get: (path) => request(path),
  post: (path, payload) => request(path, { method: 'POST', body: JSON.stringify(payload) }),
  put: (path, payload) => request(path, { method: 'PUT', body: JSON.stringify(payload) }),
  delete: (path) => request(path, { method: 'DELETE' }),
  health: () => request('/api/health'),
  status: () => request('/api/status'),
  healthDatabase: () => request('/health/database'),
  healthAuth: () => request('/health/auth'),
  getSummary: () => request('/api/summary'),
  getTransactions: (query = '') => request(`/api/transactions${query}`),
  getTransaction: (id) => request(`/api/transactions/${id}`),
  createTransaction: (payload) => request('/api/transactions', { method: 'POST', body: JSON.stringify(payload) }),
  updateTransaction: (id, payload) => request(`/api/transactions/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteTransaction: (id) => request(`/api/transactions/${id}`, { method: 'DELETE' }),
  getAccounts: () => request('/api/accounts'),
  searchAccounts: (name) => request(`/api/accounts/search?name=${encodeURIComponent(name)}`),
  createAccount: (payload) => request('/api/accounts', { method: 'POST', body: JSON.stringify(payload) }),
  updateAccount: (id, payload) => request(`/api/accounts/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteAccount: (id) => request(`/api/accounts/${id}`, { method: 'DELETE' }),
  getLedger: (id) => request(`/api/accounts/${id}/ledger`),
  getAccountBalance: (id) => request(`/api/accounts/${id}/balance`),
  getEmployees: () => request('/api/employees'),
  createEmployee: (payload) => request('/api/employees', { method: 'POST', body: JSON.stringify(payload) }),
  updateEmployee: (id, payload) => request(`/api/employees/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteEmployee: (id) => request(`/api/employees/${id}`, { method: 'DELETE' }),
  getEmployeeSalarySummary: (id, month) => request(`/api/employees/${id}/salary-summary?month=${encodeURIComponent(month)}`),
  getSalaryReport: (month, year) => request(`/api/employees/salary-report?month=${encodeURIComponent(month)}&year=${encodeURIComponent(year)}`),
  getSalarySummaryTotals: (month, year) => request(`/api/employees/salary-summary?month=${encodeURIComponent(month)}&year=${encodeURIComponent(year)}`),
  createSalaryPayment: (payload) => request('/api/employees/salary-payments', { method: 'POST', body: JSON.stringify(payload) }),
  updateSalaryPayment: (id, payload) => request(`/api/employees/salary-payments/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  deleteSalaryPayment: (id) => request(`/api/employees/salary-payments/${id}`, { method: 'DELETE' }),
  getEmployeeSalaryLedger: (id, params = {}) => {
    const query = new URLSearchParams();
    if (params.from_date) query.append('from_date', params.from_date);
    if (params.to_date) query.append('to_date', params.to_date);
    if (params.currency) query.append('currency', params.currency);
    if (params.branch_id) query.append('branch_id', params.branch_id);
    if (params.page) query.append('page', params.page);
    if (params.page_size) query.append('page_size', params.page_size);
    const queryString = query.toString() ? `?${query.toString()}` : '';
    return request(`/api/employees/${id}/salary-ledger${queryString}`);
  },
  getEmployeeSalaryAdjustments: (id) => request(`/api/employees/${id}/adjustments`),
  createEmployeeSalaryAdjustment: (id, payload) => request(`/api/employees/${id}/adjustments`, { method: 'POST', body: JSON.stringify(payload) }),
  getEmployeeSalaryHistory: (id) => request(`/api/employees/${id}/salary-history`),
  changeEmployeeSalary: (id, payload) => request(`/api/employees/${id}/salary-history`, { method: 'POST', body: JSON.stringify(payload) }),
  getSalaryChangeReport: () => request('/api/employees/salary-changes'),
  getDailyReport: () => request('/api/summary/daily'),
  getMonthlyReport: () => request('/api/summary/monthly'),
  getDateRangeReport: (start, end) => request(`/api/reports/date-range?start_date=${start}&end_date=${end}`),
  getExpenseReport: () => request('/api/reports/expenses'),
  getSettings: () => request('/api/settings'),
  updateSettings: (payload) => request('/api/settings', { method: 'PUT', body: JSON.stringify(payload) }),
  getAuthStatus: () => request('/api/auth/status'),
  setupOwner: (payload) => request('/api/auth/setup', { method: 'POST', body: JSON.stringify(payload) }),
  login: (payload) => request('/api/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  changePassword: (payload) => request('/api/auth/change-password', { method: 'POST', body: JSON.stringify(payload) }),
  logout: () => request('/api/auth/logout', { method: 'POST' }),
  getMe: () => request('/api/auth/me'),
  getUsers: () => request('/api/auth/users'),
  createUser: (payload) => request('/api/auth/users', { method: 'POST', body: JSON.stringify(payload) }),
  updateUser: (id, payload) => request(`/api/auth/users/${id}`, { method: 'PUT', body: JSON.stringify(payload) }),
  resetUserPassword: (id, payload) => request(`/api/auth/users/${id}/reset-password`, { method: 'POST', body: JSON.stringify(payload) }),
  deleteUser: (id) => request(`/api/auth/users/${id}`, { method: 'DELETE' }),
  clearAll: () => request('/api/backup/clear-all', { method: 'POST' }),
  exportBackup: () => request('/api/backup/export'),
  createBackupSnapshot: () => request('/api/backup/snapshot', { method: 'POST' }),
  getBackupSnapshots: () => request('/api/backup/snapshots'),
  restoreBackupSnapshot: (id) => request(`/api/backup/snapshots/${id}/restore`, { method: 'POST' }),
  importBackup: (payload, replaceAll = false) => request(`/api/backup/import?replace_all=${replaceAll ? 'true' : 'false'}`, { method: 'POST', body: JSON.stringify(payload) }),
  importCashbookCsv: (content, filename) => request('/api/backup/import-csv', {
    method: 'POST',
    body: JSON.stringify({ content, filename })
  }),
  importMasterExcel: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return request('/api/import-master-excel', {
      method: 'POST',
      body: formData
    });
  },
  uploadMedia: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return request('/api/upload', {
      method: 'POST',
      body: formData
    });
  },
  /**
   * Exchange a Neon Auth JWT for a standard cashbook session token.
   * @param {string} jwtToken - The Bearer token from Neon Auth
   */
  neonAuthLogin: (jwtToken) => request('/api/auth/neon-login', {
    method: 'POST',
    headers: { Authorization: `Bearer ${jwtToken}` },
  }),
  // Bawar Star Manufacturing Ledger API Methods
  getBawarStarSummary: (partnerId) => request(`/api/tenants/bawar-star/ledger-summary/${partnerId}`),
  getBawarStarTransactions: (partnerId) => request(`/api/tenants/bawar-star/transactions/${partnerId}`),
  createBawarStarTransaction: (payload) => request('/api/tenants/bawar-star/transactions', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),
  deleteBawarStarTransaction: (id) => request(`/api/tenants/bawar-star/transactions/${id}`, {
    method: 'DELETE'
  }),
};
