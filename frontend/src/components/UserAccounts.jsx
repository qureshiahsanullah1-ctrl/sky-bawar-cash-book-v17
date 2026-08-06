/* eslint-disable */
import { useMemo, useRef, useState } from 'react';
import { KeyRound, ShieldAlert, ShieldCheck, UserCog, UserPlus, Users, Edit3, Trash2, Copy, Check, Search, Shield, ToggleLeft, ToggleRight, Info } from 'lucide-react';
import DataTable from './DataTable';

const emptyUser = { id: null, full_name: '', username: '', password: '', confirm_password: '', role: 'Cashier', avatar_path: '', is_active: true };
const PASSWORD_MESSAGE = 'Password must be at least 8 characters and include uppercase, lowercase, number, and symbol.';

const ROLE_PERMISSIONS = {
  Administrator: { title: 'Full System Access', color: 'amber', desc: 'Can manage all transactions, system settings, user access, data backups, and reports.' },
  Manager: { title: 'Management & Reports', color: 'violet', desc: 'Can view/edit transactions, access customer ledgers, generate reports, and export data.' },
  Cashier: { title: 'Daily Operations', color: 'blue', desc: 'Can create and edit daily cash/USD entries and view basic customer accounts.' },
  Viewer: { title: 'Read-Only Access', color: 'slate', desc: 'Can inspect dashboard metrics and reports without permission to add or modify data.' }
};

function avatarFromFile(file, callback) {
  if (!file) return callback('');
  const reader = new FileReader();
  reader.onload = (e) => {
    const rawUrl = e.target.result;
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const size = 128;
        canvas.width = size;
        canvas.height = size;
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        callback(compressedDataUrl);
      } catch (err) {
        callback(rawUrl);
      }
    };
    img.onerror = () => callback(rawUrl);
    img.src = rawUrl;
  };
  reader.onerror = () => callback('');
  reader.readAsDataURL(file);
}

export default function UserAccounts({ currentUser, users, onCreate, onUpdate, onDelete, onResetPassword, onReload }) {
  const [form, setForm] = useState(emptyUser);
  const [customPassword, setCustomPassword] = useState('');
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [message, setMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [loadingAction, setLoadingAction] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('All');
  const [showRoleInfo, setShowRoleInfo] = useState(false);
  const fileInputRef = useRef(null);
  const canAdmin = currentUser?.role === 'Administrator';

  const update = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => ({ ...current, [field]: '' }));
  };

  const resetForm = ({ keepSuccess = '' } = {}) => {
    setForm(emptyUser);
    setCustomPassword('');
    setGeneratedPassword('');
    setMessage('');
    setSuccessMessage(keepSuccess);
    setFieldErrors({});
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const edit = (user) => {
    setForm({ ...emptyUser, ...user, password: '', confirm_password: '' });
    setCustomPassword('');
    setGeneratedPassword('');
    setMessage('');
    setSuccessMessage(`Editing ${user.full_name || user.username}.`);
    setFieldErrors({});
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  function validateForm() {
    const errors = {};
    const fullName = form.full_name.trim();
    const username = form.username.trim();
    if (!fullName) errors.full_name = 'Full Name is required.';
    if (!username) errors.username = 'Username is required.';
    const duplicate = users.some((user) => (
      user.id !== form.id && user.username?.trim().toLowerCase() === username.toLowerCase()
    ));
    if (username && duplicate) errors.username = 'Username already exists.';
    if (!form.id) {
      if (!form.password) errors.password = 'Password is required.';
      else if (!isStrongPassword(form.password)) errors.password = PASSWORD_MESSAGE;
      if (!form.confirm_password) errors.confirm_password = 'Confirm Password is required.';
      else if (form.password !== form.confirm_password) errors.confirm_password = 'Password does not match.';
    }
    setFieldErrors(errors);
    return errors;
  }

  function isStrongPassword(password) {
    return password.length >= 8
      && /[A-Z]/.test(password)
      && /[a-z]/.test(password)
      && /\d/.test(password)
      && /[^A-Za-z0-9]/.test(password);
  }
  
  function friendlyError(error, fallback) {
    if (!error) return fallback;
    const rawText = typeof error === 'string' ? error : (error.message || '');
    if (!rawText) return fallback;
    const cleanText = rawText.replace(/^Server error \(\d+\):\s*/, '').trim();
    if (cleanText.includes('Username already exists')) return 'Username already exists.';
    if (cleanText.includes('Passwords do not match')) return 'Password does not match.';
    if (cleanText.includes('Login required') || cleanText.includes('Unauthorized') || cleanText.includes('Could not validate credentials')) return 'Your admin session expired. Please log in again.';
    if (cleanText.includes('Administrator access required')) return 'Administrator access required.';
    return cleanText || fallback;
  }

  async function save(event) {
    event.preventDefault();
    if (!canAdmin) return;
    setMessage('');
    setSuccessMessage('');
    const errors = validateForm();
    if (Object.keys(errors).length) {
      setMessage(Object.values(errors)[0]);
      return;
    }
    setLoadingAction(form.id ? 'save' : 'add');
    try {
      const basePayload = {
        fullName: form.full_name.trim(),
        username: form.username.trim(),
        role: form.role,
        status: form.is_active ? 'Active' : 'Inactive',
        avatar: form.avatar_path || '',
      };
      if (form.id) {
        await onUpdate(form.id, basePayload);
        resetForm({ keepSuccess: 'User updated successfully.' });
      } else {
        await onCreate({
          ...basePayload,
          password: form.password,
        });
        resetForm({ keepSuccess: 'User added successfully.' });
      }
      await onReload?.();
    } catch (error) {
      setMessage(friendlyError(error, form.id ? 'Failed to update user.' : 'Failed to add user.'));
    } finally {
      setLoadingAction('');
    }
  }

  async function resetPassword(userId, generated = false) {
    if (!canAdmin || (!generated && !form.id)) return;
    setMessage('');
    setSuccessMessage('');
    if (!generated && !isStrongPassword(customPassword)) {
      setFieldErrors({ customPassword: PASSWORD_MESSAGE });
      setMessage(PASSWORD_MESSAGE);
      return;
    }
    setLoadingAction(generated ? `generate-${userId}` : 'custom-password');
    try {
      const result = await onResetPassword(userId, { password: generated ? null : customPassword });
      setGeneratedPassword(result?.password || '');
      setCustomPassword('');
      setFieldErrors((current) => ({ ...current, customPassword: '' }));
      setSuccessMessage(generated ? 'Strong password generated. Copy it now before leaving this page.' : 'Password updated successfully.');
    } catch (error) {
      setMessage(friendlyError(error, 'Failed to reset password.'));
    } finally {
      setLoadingAction('');
    }
  }

  async function copyGeneratedPassword() {
    if (!generatedPassword) return;
    try {
      await navigator.clipboard.writeText(generatedPassword);
      setSuccessMessage('Generated password copied.');
    } catch {
      setMessage('Could not copy automatically. Select the generated password and copy it manually.');
    }
  }

  function useGeneratedPassword() {
    if (!generatedPassword) return;
    setCustomPassword(generatedPassword);
    setFieldErrors((current) => ({ ...current, customPassword: '' }));
  }

  const toggleUserStatus = async (user) => {
    if (!canAdmin || currentUser?.id === user.id) return;
    setLoadingAction(`toggle-${user.id}`);
    try {
      await onUpdate(user.id, {
        fullName: user.full_name,
        username: user.username,
        role: user.role,
        status: user.is_active ? 'Inactive' : 'Active',
        avatar: user.avatar_path || '',
      });
      setSuccessMessage(`User @${user.username} set to ${user.is_active ? 'Inactive' : 'Active'}.`);
      await onReload?.();
    } catch (err) {
      setMessage(friendlyError(err, 'Failed to update user status.'));
    } finally {
      setLoadingAction('');
    }
  };

  const filteredUsers = useMemo(() => {
    return (users || []).filter((user) => {
      const matchRole = selectedRoleFilter === 'All' || user.role === selectedRoleFilter;
      const matchSearch = !searchTerm || (
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      return matchRole && matchSearch;
    });
  }, [users, selectedRoleFilter, searchTerm]);

  const columns = useMemo(() => [
    { 
      key: 'user', 
      label: 'User Info', 
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden border border-indigo-200 dark:border-indigo-500/30">
            {row.avatar_path ? <img src={row.avatar_path} alt="" className="w-full h-full object-cover" /> : row.full_name?.[0]?.toUpperCase()}
          </div>
          <div className="flex flex-col">
            <strong className="text-zinc-900 dark:text-zinc-100 text-sm">{row.full_name}</strong>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">@{row.username}</span>
          </div>
        </div>
      )
    },
    { 
      key: 'role', 
      label: 'Role', 
      render: (row) => {
        const conf = ROLE_PERMISSIONS[row.role] || { color: 'blue' };
        return (
          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-${conf.color}-100 text-${conf.color}-700 dark:bg-${conf.color}-500/20 dark:text-${conf.color}-400 border border-${conf.color}-200 dark:border-${conf.color}-500/30`}>
            {row.role}
          </span>
        );
      },
      className: 'w-32'
    },
    { 
      key: 'status', 
      label: 'Status', 
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${row.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
          <span className={`text-xs font-semibold ${row.is_active ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
            {row.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
      ),
      className: 'w-28'
    },
    { key: 'last_login', label: 'Last Login', render: (row) => <span className="text-xs text-zinc-500">{row.last_login ? new Date(row.last_login).toLocaleString() : 'Never'}</span>, className: 'w-40' },
    { 
      key: 'actions', 
      label: 'Actions', 
      className: 'w-52 text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button type="button" className="p-1.5 text-zinc-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors disabled:opacity-50" onClick={() => edit(row)} disabled={!canAdmin || !!loadingAction} title="Edit User">
            <Edit3 size={16} />
          </button>
          <button type="button" className="p-1.5 text-zinc-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-lg transition-colors disabled:opacity-50" onClick={() => resetPassword(row.id, true)} disabled={!canAdmin || !!loadingAction} title="Generate Password">
            <KeyRound size={16} />
          </button>
          <button type="button" className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${row.is_active ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10' : 'text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`} onClick={() => toggleUserStatus(row)} disabled={!canAdmin || currentUser?.id === row.id || !!loadingAction} title={row.is_active ? "Deactivate User" : "Activate User"}>
            {row.is_active ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
          </button>
          <button type="button" className="p-1.5 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors disabled:opacity-50" onClick={() => onDelete(row)} disabled={!canAdmin || currentUser?.id === row.id || !!loadingAction} title="Delete User">
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ], [canAdmin, loadingAction, currentUser?.id]);

  return (
    <div className="flex flex-col gap-6 w-full pb-8 animate-in fade-in slide-in-from-bottom-4">
      
      {!canAdmin && (
        <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-300 px-4 py-3 rounded-xl flex items-center gap-3">
          <ShieldAlert size={18} />
          <span className="text-sm font-medium">Only Administrators can manage user accounts.</span>
        </div>
      )}

      {message && (
        <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-300 px-4 py-3 rounded-xl text-sm font-medium">
          {message}
        </div>
      )}

      {successMessage && (
        <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2">
          <Check size={16} /> {successMessage}
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        
        {/* Form Sidebar */}
        <div className="w-full lg:w-[320px] shrink-0">
          <div className="glass-card p-5 rounded-2xl border border-indigo-500/10 shadow-indigo-500/5">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white mb-4 flex items-center gap-2">
              <UserPlus size={16} className="text-indigo-500" />
              {form.id ? 'Edit User' : 'Add New User'}
            </h3>

            <form onSubmit={save} className="flex flex-col gap-3.5">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Full Name</label>
                <input 
                  type="text" 
                  value={form.full_name} 
                  onChange={(e) => update('full_name', e.target.value)} 
                  disabled={!canAdmin || !!loadingAction} 
                  required 
                  className={`w-full bg-white dark:bg-zinc-900 border ${fieldErrors.full_name ? 'border-rose-500' : 'border-zinc-200 dark:border-zinc-700'} rounded-lg text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500`} 
                />
                {fieldErrors.full_name && <span className="text-[10px] text-rose-500 mt-0.5">{fieldErrors.full_name}</span>}
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Username</label>
                <input 
                  type="text" 
                  value={form.username} 
                  onChange={(e) => update('username', e.target.value)} 
                  disabled={!canAdmin || !!loadingAction} 
                  required 
                  className={`w-full bg-white dark:bg-zinc-900 border ${fieldErrors.username ? 'border-rose-500' : 'border-zinc-200 dark:border-zinc-700'} rounded-lg text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500`} 
                />
                {fieldErrors.username && <span className="text-[10px] text-rose-500 mt-0.5">{fieldErrors.username}</span>}
              </div>

              {!form.id && (
                <>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Password</label>
                    <input 
                      type="password" 
                      value={form.password} 
                      onChange={(e) => update('password', e.target.value)} 
                      disabled={!canAdmin || !!loadingAction} 
                      required 
                      className={`w-full bg-white dark:bg-zinc-900 border ${fieldErrors.password ? 'border-rose-500' : 'border-zinc-200 dark:border-zinc-700'} rounded-lg text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500`} 
                    />
                    {fieldErrors.password && <span className="text-[10px] text-rose-500 mt-0.5">{fieldErrors.password}</span>}
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Confirm Password</label>
                    <input 
                      type="password" 
                      value={form.confirm_password} 
                      onChange={(e) => update('confirm_password', e.target.value)} 
                      disabled={!canAdmin || !!loadingAction} 
                      required 
                      className={`w-full bg-white dark:bg-zinc-900 border ${fieldErrors.confirm_password ? 'border-rose-500' : 'border-zinc-200 dark:border-zinc-700'} rounded-lg text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500`} 
                    />
                    {fieldErrors.confirm_password && <span className="text-[10px] text-rose-500 mt-0.5">{fieldErrors.confirm_password}</span>}
                  </div>
                </>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Role</label>
                  <select 
                    value={form.role} 
                    onChange={(e) => update('role', e.target.value)} 
                    disabled={!canAdmin || !!loadingAction} 
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm px-2 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option>Administrator</option>
                    <option>Manager</option>
                    <option>Cashier</option>
                    <option>Viewer</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Status</label>
                  <select 
                    value={form.is_active ? 'active' : 'inactive'} 
                    onChange={(e) => update('is_active', e.target.value === 'active')} 
                    disabled={!canAdmin || !!loadingAction} 
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm px-2 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1 mt-1">
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Avatar Image</label>
                <input 
                  ref={fileInputRef} 
                  type="file" 
                  accept="image/*" 
                  disabled={!canAdmin || !!loadingAction} 
                  onChange={(e) => e.target.files?.[0] && avatarFromFile(e.target.files[0], (value) => update('avatar_path', value))} 
                  className="text-xs file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                />
              </div>

              {form.avatar_path && (
                <div className="mt-2 flex justify-center">
                  <img src={form.avatar_path} alt="Avatar Preview" className="w-16 h-16 rounded-full object-cover border-2 border-indigo-200 dark:border-indigo-800" />
                </div>
              )}

              <div className="flex items-center gap-2 mt-2 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                <button type="submit" disabled={!canAdmin || !!loadingAction} className="primary-btn flex-1 py-2 text-sm shadow-md disabled:opacity-50">
                  {loadingAction === 'add' ? 'Adding...' : loadingAction === 'save' ? 'Saving...' : form.id ? 'Update User' : 'Add User'}
                </button>
                <button type="button" onClick={resetForm} disabled={!!loadingAction} className="ghost-btn py-2 text-sm">
                  Clear
                </button>
              </div>
            </form>
          </div>

          {/* Password Reset Section (Only visible when editing a user) */}
          {form.id && (
            <div className="glass-card p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 mt-4 bg-white/50 dark:bg-zinc-900/50">
              <h4 className="text-sm font-bold text-zinc-900 dark:text-white mb-3 flex items-center gap-2">
                <ShieldCheck size={14} className="text-emerald-500" />
                Password Reset
              </h4>
              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <input 
                    type="password" 
                    value={customPassword} 
                    onChange={(e) => { setCustomPassword(e.target.value); setFieldErrors((current) => ({ ...current, customPassword: '' })); }} 
                    placeholder="Set custom password" 
                    disabled={!form.id || !canAdmin || !!loadingAction} 
                    className={`w-full bg-white dark:bg-zinc-900 border ${fieldErrors.customPassword ? 'border-rose-500' : 'border-zinc-200 dark:border-zinc-700'} rounded-lg text-sm px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500`} 
                  />
                  {fieldErrors.customPassword && <span className="text-[10px] text-rose-500">{fieldErrors.customPassword}</span>}
                </div>
                <button 
                  type="button" 
                  disabled={!form.id || !customPassword || !canAdmin || !!loadingAction} 
                  onClick={() => resetPassword(form.id, false)} 
                  className="secondary-btn py-2 text-xs w-full disabled:opacity-50"
                >
                  {loadingAction === 'custom-password' ? 'Saving...' : 'Set Custom Password'}
                </button>

                {generatedPassword && (
                  <div className="mt-2 p-3 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 rounded-lg flex flex-col gap-2 animate-in fade-in zoom-in-95">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Generated</span>
                      <button onClick={copyGeneratedPassword} className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400" title="Copy"><Copy size={12} /></button>
                    </div>
                    <code className="text-sm font-bold text-indigo-900 dark:text-indigo-100 bg-white dark:bg-zinc-800 px-2 py-1 rounded border border-indigo-100 dark:border-indigo-800 break-all">
                      {generatedPassword}
                    </code>
                    <button type="button" onClick={useGeneratedPassword} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 mt-1 flex items-center gap-1 justify-center">
                      <Check size={12} /> Use this password
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Users Table */}
        <div className="flex-1 min-w-0 flex flex-col gap-3">
          
          {/* Role Permissions Information Banner */}
          {showRoleInfo && (
            <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/80 text-xs flex flex-col gap-2.5 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between">
                <span className="font-extrabold uppercase tracking-wider text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5 text-[11px]">
                  <Shield size={14} /> System Role Privileges & Permissions Guide
                </span>
                <button type="button" onClick={() => setShowRoleInfo(false)} className="text-indigo-400 hover:text-indigo-600 font-bold text-[10px]">
                  Close
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(ROLE_PERMISSIONS).map(([roleName, meta]) => (
                  <div key={roleName} className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-indigo-100 dark:border-indigo-900/50 flex flex-col gap-0.5">
                    <div className="flex items-center justify-between">
                      <strong className="font-bold text-zinc-900 dark:text-zinc-100">{roleName}</strong>
                      <span className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400">{meta.title}</span>
                    </div>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">{meta.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <DataTable
            columns={columns}
            data={filteredUsers}
            keyField="id"
            headerContent={
              <div className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-100 dark:bg-blue-500/20 rounded-xl">
                      <UserCog size={20} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-zinc-900 dark:text-white">System Users & Security Roles</h3>
                      <p className="text-xs text-zinc-500">{filteredUsers.length} of {users.length} authorized accounts</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowRoleInfo(!showRoleInfo)}
                      className={`text-xs py-1.5 px-3 rounded-xl font-bold flex items-center gap-1.5 border transition-all ${showRoleInfo ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-500/20 hover:bg-indigo-100'}`}
                    >
                      <Info size={14} />
                      <span>{showRoleInfo ? 'Hide Role Guide' : 'Role Guide'}</span>
                    </button>
                    <button type="button" onClick={onReload} className="ghost-btn text-xs py-1.5 px-3">
                      Refresh List
                    </button>
                  </div>
                </div>

                {/* Filter and Search controls */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-zinc-200/60 dark:border-zinc-800">
                  <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none">
                    {['All', 'Administrator', 'Manager', 'Cashier', 'Viewer'].map((role) => (
                      <button
                        key={role}
                        type="button"
                        onClick={() => setSelectedRoleFilter(role)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 ${selectedRoleFilter === role ? 'bg-indigo-600 text-white shadow-xs' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'}`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>

                  <div className="relative flex items-center min-w-[200px]">
                    <Search size={14} className="absolute left-2.5 text-zinc-400 pointer-events-none" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search users by name..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                  </div>
                </div>
              </div>
            }
            emptyTitle="No system users found"
            emptyDescription={searchTerm ? "No users match your search criteria." : "Add the first user account to see it listed here."}
          />
        </div>

      </div>
    </div>
  );
}
