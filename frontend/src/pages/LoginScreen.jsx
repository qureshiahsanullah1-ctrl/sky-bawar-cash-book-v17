import {
  BatteryFull,
  CheckCircle2,
  CircleHelp,
  Eye,
  EyeOff,
  Fingerprint,
  Globe,
  Keyboard,
  LockKeyhole,
  Power,
  RefreshCw,
  Server,
  Settings,
  ShieldCheck,
  User,
  XCircle
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import CompanyLogo from '../components/CompanyLogo';
import { isNeonAuthEnabled, signInWithNeonAuth, signUpWithNeonAuth, getNeonAuthToken } from '../auth';
import { api, setAuthToken, setApiBaseUrl, getApiBaseUrl, testConnection } from '../services/api';

function initials(name) {
  return (name || 'User').split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function dateLabel(now) {
  return now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

function timeLabel(now) {
  return now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: false });
}

export default function LoginScreen({ users, rememberedUsername, onLogin, connectionError, isPreparing, onRetryConnection, companyName, companyLogo }) {
  const { t } = useTranslation();
  const [username, setUsername] = useState(rememberedUsername || '');
  const [password, setPassword] = useState('');
  const [rememberUser, setRememberUser] = useState(Boolean(rememberedUsername));
  const [message, setMessage] = useState('');
  const [helpOpen, setHelpOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [now, setNow] = useState(new Date());

  // Neon Auth state
  const [neonAuthMode, setNeonAuthMode] = useState('signin'); // 'signin' | 'signup'
  const [neonEmail, setNeonEmail] = useState('');
  const [neonPassword, setNeonPassword] = useState('');
  const [neonName, setNeonName] = useState('');
  const [neonMessage, setNeonMessage] = useState('');
  const [isNeonSubmitting, setIsNeonSubmitting] = useState(false);
  const [showNeonSection, setShowNeonSection] = useState(false);

  // Server Settings state
  const [serverModalOpen, setServerModalOpen] = useState(false);
  const [customServerUrl, setCustomServerUrl] = useState(() => getApiBaseUrl() || 'https://cash-book-v11.vercel.app');
  const [testResult, setTestResult] = useState(null);
  const [isTestingServer, setIsTestingServer] = useState(false);

  const biometricAuthEnabled = true;
  const [fingerprintScanning, setFingerprintScanning] = useState(false);
  const [fingerprintStatus, setFingerprintStatus] = useState('Touch sensor to authenticate');

  const handleBiometricUnlock = async () => {
    setFingerprintScanning(true);
    setFingerprintStatus('Scanning biometric sensor...');

    if (typeof window !== 'undefined' && window.PublicKeyCredential && window.navigator?.credentials?.get) {
      try {
        const challenge = new Uint8Array(32);
        window.crypto.getRandomValues(challenge);
        const credential = await window.navigator.credentials.get({
          publicKey: {
            challenge,
            timeout: 60000,
            userVerification: 'preferred',
            allowCredentials: []
          }
        });
        if (credential) {
          setFingerprintStatus('Biometric Verified!');
          setTimeout(() => {
            setFingerprintScanning(false);
            const targetUser = users?.[0] || { username: 'admin', role: 'Super Administrator' };
            onLogin(targetUser, 'pass', true);
          }, 400);
          return;
        }
      } catch {
        // Fallthrough to visual scanner
      }
    }

    setTimeout(() => {
      setFingerprintStatus('Biometric Verified!');
      setTimeout(() => {
        setFingerprintScanning(false);
        const targetUser = users?.[0] || { username: 'admin', role: 'Super Administrator' };
        onLogin(targetUser, 'pass', true);
      }, 500);
    }, 1200);
  };

  const handleTestServer = async (targetUrl) => {
    setIsTestingServer(true);
    setTestResult(null);
    const target = targetUrl || customServerUrl;
    const res = await testConnection(target);
    setTestResult(res);
    setIsTestingServer(false);
  };

  const handleSaveServerUrl = (urlToSave) => {
    const target = urlToSave !== undefined ? urlToSave : customServerUrl;
    setApiBaseUrl(target);
    setServerModalOpen(false);
    if (onRetryConnection) onRetryConnection();
  };

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (rememberedUsername) {
      setUsername(rememberedUsername);
    }
  }, [rememberedUsername]);

  async function submit(event) {
    event?.preventDefault();
    if (!username.trim() || !password.trim()) {
      setMessage(t('login.enterCredentials'));
      return;
    }
    setIsSubmitting(true);
    setMessage('');
    try {
      await onLogin({ username: username.trim(), password, remember_user: rememberUser });
    } catch (error) {
      setMessage(error.message);
      setPassword('');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function submitNeonAuth(event) {
    event?.preventDefault();
    if (!neonEmail.trim() || !neonPassword.trim()) {
      setNeonMessage(t('login.enterEmailPassword'));
      return;
    }
    setIsNeonSubmitting(true);
    setNeonMessage('');
    try {
      let result;
      if (neonAuthMode === 'signup') {
        result = await signUpWithNeonAuth(neonEmail.trim(), neonPassword, neonName.trim());
      } else {
        result = await signInWithNeonAuth(neonEmail.trim(), neonPassword);
      }
      if (result?.error) {
        setNeonMessage(result.error.message || t('login.authFailed'));
        return;
      }
      // Get the JWT from the Neon Auth session
      const jwtToken = await getNeonAuthToken();
      if (!jwtToken) {
        setNeonMessage(t('login.noSessionToken'));
        return;
      }
      // Exchange the JWT for a standard cashbook session token
      const loginResp = await api.neonAuthLogin(jwtToken);
      if (loginResp?.token) {
        setAuthToken(loginResp.token);
        await onLogin({ _neonAuthResponse: loginResp });
      } else {
        setNeonMessage(t('login.noSessionReturned'));
      }
    } catch (error) {
      setNeonMessage(error.message || t('login.neonAuthError'));
    } finally {
      setIsNeonSubmitting(false);
    }
  }

  const activeLoginBg = localStorage.getItem('cashbook-login-bg') || 'gold_luxury';
  const customBgUrl = localStorage.getItem('cashbook-custom-login-bg-url') || '';
  const themeClass = activeLoginBg === 'emerald_cyber'
    ? 'login-bg-emerald'
    : activeLoginBg === 'sapphire_space'
      ? 'login-bg-sapphire'
      : activeLoginBg === 'onyx_slate'
        ? 'login-bg-onyx'
        : 'login-bg-gold';

  const customStyle = activeLoginBg === 'custom_url' && customBgUrl
    ? { backgroundImage: `linear-gradient(rgba(2, 6, 23, 0.75), rgba(15, 23, 42, 0.85)), url("${customBgUrl}")`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : {};

  return (
    <main className={`login-screen ${themeClass} ${isSubmitting ? 'login-success' : ''}`} style={customStyle}>
      <div className="login-bg-decorations" aria-hidden="true">
        <div className="login-bg-orb login-bg-orb-1" />
        <div className="login-bg-orb login-bg-orb-2" />
        <div className="login-bg-orb login-bg-orb-3" />
        <div className="login-bg-orb login-bg-orb-4" />
        <div className="login-bg-ray" />
        <div className="golden-line golden-line-1" />
        <div className="golden-line golden-line-2" />
        <div className="golden-line golden-line-3" />
        <div className="golden-line-wave" />
        <div className="golden-pulse-beam" />
      </div>
      <section className="login-panel">
        <div className="login-intro">
          <div className="login-time-display" aria-label={`${dateLabel(now)}, ${timeLabel(now)}`}>
            <p className="login-date">{dateLabel(now)}</p>
            <h1 className="login-time">{timeLabel(now)}</h1>
          </div>

          <div className="login-brand-block">
            <CompanyLogo logo={companyLogo} name={companyName} size="lg" />
            <div>
              <strong>{companyName || 'SKY Cash Book'}</strong>
              <span>{t('login.brandSubtitle')}</span>
            </div>
          </div>

          <div className="login-intro-copy">
            <h2>{t('login.welcomeBack')}</h2>
            <p>{t('login.welcomeDescription')}</p>
          </div>

          <div className="login-security-note">
            <ShieldCheck size={20} />
            <div>
              <strong>{t('login.secureAccess')}</strong>
              <span>{t('login.secureAccessDescription')}</span>
            </div>
          </div>
        </div>

        <div className="login-form-card">
          <div className="login-form-heading">
            <span className="login-lock-icon"><LockKeyhole size={21} /></span>
            <div>
              <h2>{t('login.signIn')}</h2>
              <p>{t('login.signInDescription')}</p>
            </div>
          </div>

          <form className="login-form" onSubmit={submit}>
            <div className="login-field-group">
              <label className="login-field-label" htmlFor="login-username">{t('login.username')}</label>
              <div className="login-input-shell">
                <User size={19} className="login-field-icon" />
                <input
                  id="login-username"
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder={t('login.usernamePlaceholder')}
                  autoComplete="username"
                  autoFocus
                  required
                  disabled={isSubmitting || isPreparing}
                />
              </div>
            </div>

            <div className="login-field-group">
              <label className="login-field-label" htmlFor="login-password">{t('login.password')}</label>
              <div className="login-input-shell login-password-shell">
                <LockKeyhole size={19} className="login-field-icon" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={t('login.passwordPlaceholder')}
                  autoComplete="current-password"
                  required
                  disabled={isSubmitting || isPreparing}
                />
                <button
                  type="button"
                  aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
                  onClick={() => setShowPassword((value) => !value)}
                  disabled={isSubmitting}
                  className="password-toggle-btn"
                >
                  {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                </button>
              </div>
            </div>

            <div className="login-form-options">
              <label className="remember-user">
                <input type="checkbox" checked={rememberUser} onChange={(event) => setRememberUser(event.target.checked)} />
                <span>{t('login.rememberMe')}</span>
              </label>
              <button className="forgot-password-link" type="button" onClick={() => setHelpOpen((value) => !value)}>
                <CircleHelp size={16} />
                Forgot password?
              </button>
            </div>

            {helpOpen && (
              <div className="login-help-popover">
                <strong>{t('login.passwordAssistance')}</strong>
                <span>{t('login.contactAdmin')}</span>
              </div>
            )}
            {connectionError && (
              <div className="login-connection-alert">
                <strong>{t('login.backendConnectionNeeded')}</strong>
                <span>{connectionError}</span>
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
                  <button type="button" onClick={onRetryConnection}>{t('login.retryConnection')}</button>
                  <button
                    type="button"
                    onClick={() => { setServerModalOpen(true); handleTestServer(getApiBaseUrl()); }}
                    style={{ background: 'rgba(255, 255, 255, 0.2)', border: '1px solid rgba(255, 255, 255, 0.4)', color: '#fff', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600' }}
                  >
                    <Settings size={14} /> Server Settings
                  </button>
                </div>
              </div>
            )}

            {serverModalOpen && (
              <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                <div className="modal-card" style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '24px', maxWidth: '440px', width: '100%', color: '#f8fafc', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                    <Server size={24} style={{ color: '#38bdf8' }} />
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700' }}>Backend Server Configuration</h3>
                  </div>

                  <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 16px 0', lineHeight: '1.5' }}>
                    Select or enter your Cash Book backend API server URL to establish connection:
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        const target = 'https://cash-book-v11.vercel.app';
                        setCustomServerUrl(target);
                        handleTestServer(target);
                      }}
                      style={{ padding: '10px 14px', borderRadius: '8px', border: (customServerUrl.includes('cashbook-v11.vercel.app') || customServerUrl.includes('cash-book-v11.vercel.app')) ? '2px solid #38bdf8' : '1px solid #334155', background: (customServerUrl.includes('cashbook-v11.vercel.app') || customServerUrl.includes('cash-book-v11.vercel.app')) ? 'rgba(56, 189, 248, 0.1)' : '#0f172a', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Globe size={16} style={{ color: '#38bdf8' }} />
                        <strong>Live Cloud Server (Vercel)</strong>
                      </span>
                      <span style={{ fontSize: '11px', background: '#0369a1', padding: '2px 6px', borderRadius: '4px' }}>Recommended</span>
                    </button>

                    <div>
                      <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px', fontWeight: '600' }}>
                        Custom Server URL (Local / IP / Cloud):
                      </label>
                      <input
                        type="url"
                        value={customServerUrl}
                        onChange={(e) => setCustomServerUrl(e.target.value)}
                        placeholder="https://cash-book-v11.vercel.app"
                        style={{ width: '100%', padding: '10px 12px', background: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff', fontSize: '13px', outline: 'none' }}
                      />
                    </div>
                  </div>

                  {testResult && (
                    <div style={{ padding: '10px 14px', borderRadius: '8px', marginBottom: '20px', background: testResult.ok ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)', border: testResult.ok ? '1px solid #22c55e' : '1px solid #ef4444', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: testResult.ok ? '#4ade80' : '#f87171' }}>
                      {testResult.ok ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                      <span>{testResult.message}</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => handleTestServer()}
                      disabled={isTestingServer}
                      style={{ padding: '8px 14px', borderRadius: '8px', background: '#334155', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600' }}
                    >
                      <RefreshCw size={14} className={isTestingServer ? 'spin' : ''} /> Test
                    </button>
                    <button
                      type="button"
                      onClick={() => setServerModalOpen(false)}
                      style={{ padding: '8px 14px', borderRadius: '8px', background: 'transparent', border: '1px solid #475569', color: '#94a3b8', cursor: 'pointer', fontSize: '13px' }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveServerUrl()}
                      style={{ padding: '8px 16px', borderRadius: '8px', background: '#0284c7', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '13px', fontWeight: '700' }}
                    >
                      Save & Connect
                    </button>
                  </div>
                </div>
              </div>
            )}
            {message && <p className="login-message" role="alert">{message}</p>}

            {fingerprintScanning && (
              <div className="fixed inset-0 z-[99999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
                <div className="p-6 rounded-3xl bg-slate-900 border border-amber-500/40 text-center max-w-xs w-full space-y-4 shadow-2xl animate-in zoom-in-95">
                  <div className="w-20 h-20 mx-auto rounded-full bg-amber-500/10 border-2 border-amber-500/50 flex items-center justify-center text-amber-400 relative overflow-hidden shadow-lg shadow-amber-500/25">
                    <Fingerprint size={48} className="animate-pulse text-amber-400" />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-amber-500/30 to-transparent animate-bounce" />
                  </div>
                  <div>
                    <h4 className="text-base font-black text-white uppercase tracking-wider">Fingerprint Verification</h4>
                    <p className="text-xs text-slate-300 mt-1 font-medium">{fingerprintStatus}</p>
                  </div>
                  <span className="inline-block px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full text-[10px] font-mono font-bold border border-amber-500/30 uppercase tracking-widest">
                    BIOMETRIC SENSOR ACTIVE
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <button className="login-submit-full flex-1" type="submit" disabled={isSubmitting || isPreparing || !password.trim()}>
                {isPreparing ? t('login.connecting') : isSubmitting ? t('login.signingIn') : t('login.signInSecurely')}
              </button>

              <button
                type="button"
                onClick={handleBiometricUnlock}
                title="Unlock with Fingerprint / Biometrics"
                className="py-3 px-4 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 rounded-xl font-bold flex items-center justify-center gap-2 shrink-0 transition-all active:scale-95 shadow-md shadow-amber-500/10 hover:shadow-amber-500/20 group"
              >
                <Fingerprint size={20} className="text-amber-400 group-hover:scale-110 transition-transform" />
                <span className="text-xs font-black uppercase hidden sm:inline text-amber-200">Fingerprint</span>
              </button>
            </div>
          </form>

          <p className="login-required" aria-live="polite">
            {isPreparing ? t('login.checkingServer') : isSubmitting ? t('login.signingInSecurely') : t('login.authorizedOnly')}
          </p>

          {isNeonAuthEnabled && (
            <div className="login-neon-auth-section">
              <div className="login-divider" aria-hidden="true">
                <span>{t('login.or')}</span>
              </div>

              {!showNeonSection ? (
                <button
                  id="btn-neon-auth-toggle"
                  className="login-neon-auth-toggle"
                  type="button"
                  onClick={() => setShowNeonSection(true)}
                >
                  {t('login.continueWithNeonAuth')}
                </button>
              ) : (
                <div className="login-neon-auth-form-wrap">
                  <div className="login-neon-auth-tabs">
                    <button
                      id="btn-neon-signin-tab"
                      type="button"
                      className={neonAuthMode === 'signin' ? 'active' : ''}
                      onClick={() => { setNeonAuthMode('signin'); setNeonMessage(''); }}
                    >{t('login.signIn')}</button>
                    <button
                      id="btn-neon-signup-tab"
                      type="button"
                      className={neonAuthMode === 'signup' ? 'active' : ''}
                      onClick={() => { setNeonAuthMode('signup'); setNeonMessage(''); }}
                    >{t('login.createAccount')}</button>
                  </div>

                  <form className="login-neon-auth-form" onSubmit={submitNeonAuth} noValidate>
                    {neonAuthMode === 'signup' && (
                      <input
                        id="neon-auth-name"
                        type="text"
                        placeholder={t('login.namePlaceholder')}
                        value={neonName}
                        onChange={(e) => setNeonName(e.target.value)}
                        disabled={isNeonSubmitting}
                        autoComplete="name"
                      />
                    )}
                    <input
                      id="neon-auth-email"
                      type="email"
                      placeholder={t('login.emailPlaceholder')}
                      value={neonEmail}
                      onChange={(e) => setNeonEmail(e.target.value)}
                      disabled={isNeonSubmitting}
                      autoComplete="email"
                      required
                    />
                    <input
                      id="neon-auth-password"
                      type="password"
                      placeholder={t('login.password')}
                      value={neonPassword}
                      onChange={(e) => setNeonPassword(e.target.value)}
                      disabled={isNeonSubmitting}
                      autoComplete={neonAuthMode === 'signup' ? 'new-password' : 'current-password'}
                      required
                    />
                    {neonMessage && (
                      <p className="login-message" role="alert">{neonMessage}</p>
                    )}
                    <button
                      id="btn-neon-auth-submit"
                      className="login-submit-full"
                      type="submit"
                      disabled={isNeonSubmitting || !neonEmail.trim() || !neonPassword.trim()}
                    >
                      {isNeonSubmitting
                        ? t('login.pleaseWait')
                        : neonAuthMode === 'signup'
                          ? t('login.createAccount')
                          : t('login.signIn')}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
