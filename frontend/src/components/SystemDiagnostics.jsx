import { useState } from 'react';
import { 
  Server, 
  Database, 
  Activity, 
  ShieldCheck, 
  Cpu, 
  UserCheck, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle,
  Cloud,
  Layers,
  Clock
} from 'lucide-react';
import { API_BASE } from '../services/api';

function StatusBadge({ status, children }) {
  const isOnline = status === 'online' || status === 'connected' || status === 'ok' || status === 'ready' || status === 'healthy';
  return (
    <span className={`diag-status-badge ${isOnline ? 'online' : 'offline'}`}>
      <span className="diag-pulse-dot" />
      {children}
    </span>
  );
}

function normalizeStatus(value) {
  return String(value || '').trim().toLowerCase();
}

export default function SystemDiagnostics({ diagnostics, currentUser, onRefresh }) {
  const [refreshing, setRefreshing] = useState(false);
  const health = diagnostics?.health || {};
  const database = diagnostics?.database || {};
  const auth = diagnostics?.auth || {};
  const isLoading = diagnostics?.loading || refreshing;

  const healthStatus = normalizeStatus(health.status);
  const apiStatus = normalizeStatus(health.api || health.status);
  const databaseStatus = normalizeStatus(database.database || health.database);
  const authStatus = normalizeStatus(auth.auth || health.auth);
  
  const backendOnline = normalizeStatus(health.backend) === 'online'
    || apiStatus === 'ok'
    || healthStatus === 'ok'
    || healthStatus === 'healthy'
    || databaseStatus === 'connected'
    || authStatus === 'ready';

  const backendLabel = isLoading ? 'Checking...' : backendOnline ? 'Online' : 'Offline';
  const dbLabel = isLoading ? 'Checking...' : (database.database || health.database || (databaseStatus === 'connected' ? 'Connected' : 'Offline'));
  const apiLabel = isLoading ? 'Checking...' : (health.api || health.status || (apiStatus === 'ok' ? 'Operational' : 'Degraded'));
  const authLabel = isLoading ? 'Checking...' : (auth.auth || health.auth || (authStatus === 'ready' ? 'Active & Ready' : 'Unavailable'));

  // Port resolution
  const portLabel = health.port && health.port !== 'N/A'
    ? health.port
    : (typeof window !== 'undefined' && window.location.protocol === 'https:' 
        ? '443 (Cloud / HTTPS)' 
        : (API_BASE ? API_BASE.replace(/^https?:\/\//, '') : '80 (HTTP)'));

  // User resolution: prevent 'undefined'
  const activeUser = currentUser || health.currentUser;
  const userFullName = activeUser?.full_name || activeUser?.name || health.currentUser?.full_name || health.currentUser?.name;
  const userUsername = activeUser?.username || health.currentUser?.username;
  const userRole = activeUser?.role || health.currentUser?.role || 'Administrator';
  const displayName = userFullName || userUsername || (activeUser ? 'System User' : 'Not signed in');
  const userDisplay = activeUser ? `${displayName} (${userRole})` : 'Not signed in';

  // Environment and DB Engine
  const environment = health.environment 
    || (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app') ? 'Vercel Serverless' : 'Production');
  const dbEngine = health.database_engine || 'SQLite / PostgreSQL';

  const handleRefresh = async () => {
    if (isLoading) return;
    setRefreshing(true);
    try {
      if (onRefresh) await onRefresh();
    } finally {
      setTimeout(() => setRefreshing(false), 400);
    }
  };

  const allOperational = backendOnline && (databaseStatus === 'connected' || databaseStatus === 'healthy') && (authStatus === 'ready' || authStatus === 'healthy');

  return (
    <div className="glass-card form-card diagnostics-panel modern-diag-card">
      <div className="card-header diag-header">
        <div className="diag-header-left">
          <div className={`diag-overall-icon ${allOperational ? 'healthy' : 'warning'}`}>
            {allOperational ? <CheckCircle2 size={22} /> : <AlertTriangle size={22} />}
          </div>
          <div>
            <h3 className="diag-title">System Diagnostics</h3>
            <p className="diag-subtitle">
              {allOperational ? 'All core services and database layers are operational' : 'System running with performance notices'}
            </p>
          </div>
        </div>
        <button 
          type="button"
          className="ghost-btn diag-refresh-btn" 
          onClick={handleRefresh} 
          disabled={isLoading}
          title="Refresh real-time system metrics"
        >
          <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
          <span>{isLoading ? 'Checking...' : 'Refresh'}</span>
        </button>
      </div>

      {diagnostics?.error && (
        <div className="diagnostics-error modern-diag-error">
          <AlertTriangle size={16} />
          <span>Health check notice: {diagnostics.error}</span>
        </div>
      )}

      <div className="modern-diag-grid">
        {/* 1. Backend Status */}
        <div className="diag-metric-card" title={diagnostics?.error ? `Backend: ${diagnostics.error}` : 'FastAPI core backend service'}>
          <div className="diag-card-top">
            <div className="diag-icon-bubble blue">
              <Server size={18} />
            </div>
            <StatusBadge status={backendOnline ? 'online' : 'offline'}>
              {backendLabel}
            </StatusBadge>
          </div>
          <div className="diag-card-bottom">
            <span className="diag-metric-label">Backend Service</span>
            <strong className="diag-metric-val">FastAPI Core</strong>
          </div>
        </div>

        {/* 2. Database Status */}
        <div className="diag-metric-card">
          <div className="diag-card-top">
            <div className="diag-icon-bubble emerald">
              <Database size={18} />
            </div>
            <StatusBadge status={databaseStatus === 'connected' || databaseStatus === 'healthy' ? 'connected' : 'offline'}>
              {dbLabel}
            </StatusBadge>
          </div>
          <div className="diag-card-bottom">
            <span className="diag-metric-label">Database Status</span>
            <strong className="diag-metric-val">{dbEngine}</strong>
          </div>
        </div>

        {/* 3. API Status */}
        <div className="diag-metric-card">
          <div className="diag-card-top">
            <div className="diag-icon-bubble purple">
              <Activity size={18} />
            </div>
            <StatusBadge status={apiStatus === 'ok' || healthStatus === 'healthy' ? 'ok' : 'offline'}>
              {apiLabel}
            </StatusBadge>
          </div>
          <div className="diag-card-bottom">
            <span className="diag-metric-label">API Gateway</span>
            <strong className="diag-metric-val">REST / JSON</strong>
          </div>
        </div>

        {/* 4. Auth Status */}
        <div className="diag-metric-card">
          <div className="diag-card-top">
            <div className="diag-icon-bubble amber">
              <ShieldCheck size={18} />
            </div>
            <StatusBadge status={authStatus === 'ready' || authStatus === 'healthy' ? 'ready' : 'offline'}>
              {authLabel}
            </StatusBadge>
          </div>
          <div className="diag-card-bottom">
            <span className="diag-metric-label">Authentication</span>
            <strong className="diag-metric-val">JWT Multi-Tenant</strong>
          </div>
        </div>

        {/* 5. Server Version */}
        <div className="diag-metric-card">
          <div className="diag-card-top">
            <div className="diag-icon-bubble cyan">
              <Layers size={18} />
            </div>
            <span className="diag-tag-pill">v{health.version || '2.1.0'}</span>
          </div>
          <div className="diag-card-bottom">
            <span className="diag-metric-label">Release Version</span>
            <strong className="diag-metric-val">Bawar Star ERP</strong>
          </div>
        </div>

        {/* 6. Port & Network */}
        <div className="diag-metric-card">
          <div className="diag-card-top">
            <div className="diag-icon-bubble indigo">
              <Cpu size={18} />
            </div>
            <span className="diag-tag-pill">{portLabel}</span>
          </div>
          <div className="diag-card-bottom">
            <span className="diag-metric-label">Port / Network</span>
            <strong className="diag-metric-val">{environment}</strong>
          </div>
        </div>

        {/* 7. Current User */}
        <div className="diag-metric-card diag-span-wide">
          <div className="diag-card-top">
            <div className="diag-icon-bubble teal">
              <UserCheck size={18} />
            </div>
            <span className="diag-role-pill">{userRole}</span>
          </div>
          <div className="diag-card-bottom">
            <span className="diag-metric-label">Current Authenticated User</span>
            <strong className="diag-metric-val diag-user-val">{userDisplay}</strong>
          </div>
        </div>
      </div>

      {health.timestamp && (
        <div className="diag-footer">
          <Clock size={13} />
          <span>Last synchronized: {new Date(health.timestamp).toLocaleTimeString()} ({new Date(health.timestamp).toLocaleDateString()})</span>
        </div>
      )}
    </div>
  );
}
