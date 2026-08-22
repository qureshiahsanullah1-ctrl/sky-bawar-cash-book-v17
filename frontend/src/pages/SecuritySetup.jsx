import { ShieldCheck, Eye, EyeOff, CheckCircle2, ArrowRight, LogOut, KeyRound } from 'lucide-react';
import { useState } from 'react';
import CompanyLogo from '../components/CompanyLogo';

const passwordHelp = 'Use 8+ characters with uppercase, lowercase, number, and symbol.';

export default function SecuritySetup({ 
  mode, 
  currentUser, 
  onSetup, 
  onChangePassword, 
  onLogout, 
  onSkip,
  companyName, 
  companyLogo 
}) {
  const [form, setForm] = useState({
    full_name: 'Administrator',
    username: 'admin',
    password: '',
    confirm_password: '',
    current_password: '',
    new_password: '',
    confirm_new_password: '',
  });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const setupMode = mode === 'setup';

  const hasLength = (form.new_password || form.password).length >= 8;
  const hasUpper = /[A-Z]/.test(form.new_password || form.password);
  const hasLower = /[a-z]/.test(form.new_password || form.password);
  const hasNumber = /[0-9]/.test(form.new_password || form.password);
  const hasSymbol = /[^A-Za-z0-9]/.test(form.new_password || form.password);
  const passwordsMatch = setupMode 
    ? Boolean(form.password && form.password === form.confirm_password)
    : Boolean(form.new_password && form.new_password === form.confirm_new_password);

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      if (setupMode) {
        await onSetup({
          full_name: form.full_name,
          username: form.username,
          password: form.password,
          confirm_password: form.confirm_password,
        });
      } else {
        await onChangePassword({
          current_password: form.current_password,
          new_password: form.new_password,
          confirm_password: form.confirm_new_password,
        });
      }
    } catch (error) {
      setMessage(error.message || 'Failed to update password. Please check your current password.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-screen">
      <section className="setup-panel my-auto max-w-[480px] w-full">
        {/* Brand Header */}
        <div className="setup-brand-row flex items-center gap-3 pb-3 mb-3 border-b border-white/20">
          <CompanyLogo logo={companyLogo} name={companyName} size="md" />
          <div className="min-w-0">
            <strong className="block text-sm sm:text-base font-extrabold text-white uppercase tracking-tight truncate">
              {companyName || 'BAWAR STAR PLASTIC INDUSTRY'}
            </strong>
            <span className="text-[11px] text-white/70 font-semibold uppercase tracking-wider block">
              Secure Account Setup
            </span>
          </div>
        </div>

        {/* Header Icon & Title */}
        <div className="flex items-center gap-3 my-3">
          <div className="w-11 h-11 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center text-white shrink-0 shadow-lg">
            <ShieldCheck size={24} className="text-amber-300" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-white leading-tight">
              {setupMode ? 'Create Administrator Account' : 'Change Default Password'}
            </h1>
            <p className="text-xs text-white/80 font-medium mt-0.5 leading-snug">
              {setupMode
                ? 'Create the primary Administrator account to secure your financial system.'
                : `${currentUser?.full_name || 'Administrator'}, please set a secure personal password.`}
            </p>
          </div>
        </div>

        <form className="setup-form mt-4 space-y-3" onSubmit={submit}>
          {setupMode ? (
            <>
              <label className="block text-xs font-bold text-white/90">
                Full Name
                <input 
                  className="mt-1" 
                  value={form.full_name} 
                  onChange={(event) => update('full_name', event.target.value)} 
                  required 
                />
              </label>
              <label className="block text-xs font-bold text-white/90">
                Username
                <input 
                  className="mt-1" 
                  value={form.username} 
                  onChange={(event) => update('username', event.target.value)} 
                  required 
                />
              </label>
              <label className="block text-xs font-bold text-white/90">
                Password
                <div className="relative mt-1">
                  <input 
                    type={showNew ? 'text' : 'password'} 
                    value={form.password} 
                    onChange={(event) => update('password', event.target.value)} 
                    required 
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                  >
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>
              <label className="block text-xs font-bold text-white/90">
                Confirm Password
                <div className="relative mt-1">
                  <input 
                    type={showConfirm ? 'text' : 'password'} 
                    value={form.confirm_password} 
                    onChange={(event) => update('confirm_password', event.target.value)} 
                    required 
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </label>
            </>
          ) : (
            <>
              {/* Current Password Field with Default Helper */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white/90">Current Password</label>
                  <button
                    type="button"
                    onClick={() => update('current_password', 'Admin@123')}
                    className="text-[10px] text-amber-300 hover:underline font-bold flex items-center gap-1"
                  >
                    <KeyRound size={11} /> Fill Default (Admin@123)
                  </button>
                </div>
                <div className="relative mt-1">
                  <input 
                    type={showCurrent ? 'text' : 'password'} 
                    value={form.current_password} 
                    onChange={(event) => update('current_password', event.target.value)} 
                    placeholder="Enter your current or default password"
                    required 
                    autoFocus 
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                  >
                    {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-bold text-white/90">New Password</label>
                <div className="relative mt-1">
                  <input 
                    type={showNew ? 'text' : 'password'} 
                    value={form.new_password} 
                    onChange={(event) => update('new_password', event.target.value)} 
                    placeholder="Enter a new strong password"
                    required 
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                  >
                    {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-xs font-bold text-white/90">Confirm New Password</label>
                <div className="relative mt-1">
                  <input 
                    type={showConfirm ? 'text' : 'password'} 
                    value={form.confirm_new_password} 
                    onChange={(event) => update('confirm_new_password', event.target.value)} 
                    placeholder="Re-type new password"
                    required 
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Real-time Password Requirements Meter */}
          <div className="p-2.5 rounded-xl bg-black/30 border border-white/15 text-[11px] space-y-1">
            <div className="text-white/70 font-semibold mb-1 flex items-center justify-between">
              <span>Password Requirements:</span>
              {passwordsMatch && (form.new_password || form.password) && (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 size={12} /> Passwords match
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[10.5px]">
              <span className={hasLength ? 'text-emerald-400 font-bold' : 'text-white/50'}>
                {hasLength ? '✓' : '•'} 8+ characters
              </span>
              <span className={hasUpper ? 'text-emerald-400 font-bold' : 'text-white/50'}>
                {hasUpper ? '✓' : '•'} Uppercase letter (A-Z)
              </span>
              <span className={hasLower ? 'text-emerald-400 font-bold' : 'text-white/50'}>
                {hasLower ? '✓' : '•'} Lowercase letter (a-z)
              </span>
              <span className={(hasNumber && hasSymbol) ? 'text-emerald-400 font-bold' : 'text-white/50'}>
                {(hasNumber && hasSymbol) ? '✓' : '•'} Number & symbol (@, #, $)
              </span>
            </div>
          </div>

          {message && (
            <div className="setup-error p-3 rounded-xl bg-rose-500/25 border border-rose-400 text-rose-100 text-xs font-bold">
              {message}
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2 pt-1">
            <button 
              className="setup-submit w-full py-3 px-4 rounded-xl text-sm font-black tracking-wide flex items-center justify-center gap-2 cursor-pointer shadow-lg active:scale-98 transition-all" 
              type="submit" 
              disabled={busy}
            >
              {busy ? 'Saving...' : setupMode ? 'Create Administrator Account' : 'Update Password'}
            </button>

            {/* Skip Option for existing logged-in user */}
            {!setupMode && onSkip && (
              <button 
                type="button" 
                onClick={onSkip}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-extrabold text-white bg-white/10 hover:bg-white/20 border border-white/25 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <span>Continue to Cash Book (Skip for Now)</span>
                <ArrowRight size={14} />
              </button>
            )}

            {!setupMode && (
              <button 
                className="setup-secondary w-full py-2 px-4 rounded-xl text-xs font-bold text-white/70 hover:text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer" 
                type="button" 
                onClick={onLogout}
              >
                <LogOut size={13} />
                <span>Back to Login</span>
              </button>
            )}
          </div>
        </form>
      </section>
    </main>
  );
}

