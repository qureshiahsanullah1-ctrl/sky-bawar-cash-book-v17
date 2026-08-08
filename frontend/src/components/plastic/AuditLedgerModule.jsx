import React, { useState } from 'react';
import { Shield, Lock, Search, AlertCircle, CheckCircle2 } from 'lucide-react';

export default function AuditLedgerModule({ isLight = false }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [logs] = useState([
    { id: 1, timestamp: '2026-07-25 15:30:12', username: 'Operator_KND', role: 'OPERATOR', ip: '192.168.1.45', action: 'SCRAP_RECOVERY_LOGGED', severity: 'INFO', details: 'Granulated 45.0 kg of scrap into RM-PP-REGRIND ($40.50 salvage)' },
    { id: 2, timestamp: '2026-07-25 14:15:00', username: 'System_Engine', role: 'MANAGER', ip: '127.0.0.1', action: 'PRODUCTION_BATCH_COMPLETED', severity: 'INFO', details: 'Completed run PR-20260725-001 for SKU PET-BTL-120ML (COGM: $2,382.20)' },
    { id: 3, timestamp: '2026-07-25 11:05:44', username: 'Procurement_Auto', role: 'MANAGER', ip: '127.0.0.1', action: 'PO_DISPATCHED', severity: 'INFO', details: 'Dispatched PO-20260725-001 to Borouge Plastics ($28,350.00)' },
    { id: 4, timestamp: '2026-07-25 09:22:18', username: 'Architect', role: 'AUDITOR', ip: '127.0.0.1', action: 'SYSTEM_INITIALIZED', severity: 'INFO', details: 'PlastiCorp Enterprise ERP initial seed completed cleanly.' },
  ]);

  const filteredLogs = logs.filter(l =>
    l.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.details.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
      
      {/* Header */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 sm:p-4 rounded-xl border shadow-2xs ${
        isLight ? 'bg-white/90 border-slate-200 text-slate-900' : 'bg-slate-900/60 border-white/10 text-white'
      }`}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30">
            <Shield size={20} />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black tracking-tight uppercase flex items-center gap-2">
              <span>Security Matrix & Immutable Audit Ledger</span>
            </h2>
            <p className={`text-xs font-medium ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Tamper-proof, append-only logs of financial overrides, role actions, and IP origins across all branches.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search audit log..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`pl-8 pr-3 py-1 rounded-lg border text-xs outline-none ${
              isLight ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400' : 'bg-slate-950 border-slate-800 text-white placeholder-slate-500'
            }`}
          />
        </div>
      </div>

      {/* Audit Matrix Table */}
      <div className={`p-4 rounded-xl border shadow-2xs overflow-x-auto custom-scrollbar ${
        isLight ? 'bg-white/90 border-slate-200 text-slate-900' : 'bg-slate-900/80 border-white/15 text-white'
      }`}>
        <table className="w-full text-left text-xs border-collapse font-sans">
          <thead>
            <tr className={`border-b ${isLight ? 'bg-slate-100/90 text-slate-700 border-slate-200' : 'bg-slate-800/90 text-slate-200 border-slate-700'}`}>
              <th className="py-2 px-3">Timestamp</th>
              <th className="py-2 px-3">User & Role</th>
              <th className="py-2 px-3">IP Origin</th>
              <th className="py-2 px-3">Action Type</th>
              <th className="py-2 px-3">Severity</th>
              <th className="py-2 px-3">Details</th>
            </tr>
          </thead>
          <tbody className={`divide-y font-medium text-[11px] ${isLight ? 'divide-slate-200' : 'divide-slate-800/80'}`}>
            {filteredLogs.map((log) => (
              <tr key={log.id} className={isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/40'}>
                <td className="py-2 px-3 font-mono text-xs">{log.timestamp}</td>
                <td className="py-2 px-3 font-bold">{log.username} <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono font-semibold">({log.role})</span></td>
                <td className="py-2 px-3 font-mono text-xs text-slate-500 dark:text-slate-400">{log.ip}</td>
                <td className="py-2 px-3 font-mono text-amber-600 dark:text-amber-400 font-bold">{log.action}</td>
                <td className="py-2 px-3">
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 text-[9.5px] font-bold">
                    {log.severity}
                  </span>
                </td>
                <td className="py-2 px-3 text-slate-600 dark:text-slate-300">{log.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
