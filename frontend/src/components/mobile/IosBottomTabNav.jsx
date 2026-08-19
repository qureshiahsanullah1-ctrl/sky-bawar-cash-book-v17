import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import GoogleIcon from '../GoogleIcon';
import { useCompany } from '../../context/CompanyContext';

export default function IosBottomTabNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { currentCompany } = useCompany();
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  const mainNavItems = [
    { path: '/', label: t('Home', 'Home'), iconName: 'dashboard' },
    { path: '/cashbook', label: t('Cash Book', 'Cash Book'), iconName: 'menu_book' },
    { path: '/bawar-star', label: t('Bawar Star', 'Bawar Star'), iconName: 'factory' },
    { path: '/employees', label: t('Salary', 'Salary'), iconName: 'badge' },
    { path: '/reports', label: t('Reports', 'Reports'), iconName: 'monitoring' },
  ];

  const moreMenuItems = [
    { path: '/bawar-star', label: t('Bawar Star Ledger', 'Bawar Star Ledger'), iconName: 'precision_manufacturing', desc: 'Manufacturing & plastic accounting' },
    { path: '/accounts', label: t('Accounts Ledger', 'Accounts Ledger'), iconName: 'group', desc: 'Manage customers & suppliers' },
    { path: '/exports', label: t('Sky Ariana Exports', 'Sky Ariana Exports'), iconName: 'local_shipping', desc: 'Container tracking & shipping' },
    { path: '/converter', label: t('Currency Converter', 'Currency Converter'), iconName: 'currency_exchange', desc: 'AFN / USD exchange rates' },
    { path: '/backup', label: t('Backup & Restore', 'Backup & Restore'), iconName: 'cloud_sync', desc: 'Save & sync database' },
    { path: '/security', label: t('Security & Access', 'Security & Access'), iconName: 'shield', desc: 'Users & permissions' },
    { path: '/settings', label: t('Settings', 'Settings'), iconName: 'settings', desc: 'System configuration' },
  ];

  const isMoreActive = moreMenuItems.some(item => location.pathname.startsWith(item.path));

  return (
    <>
      {/* Mobile More Sheet Drawer */}
      {moreMenuOpen && (
        <div className="md:hidden fixed inset-0 z-[100] flex flex-col justify-end no-print">
          <div 
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setMoreMenuOpen(false)}
          />
          
          <div className="relative bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-t border-slate-200/80 dark:border-slate-800/80 rounded-t-3xl p-5 shadow-2xl z-10 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="text-base font-black text-slate-900 dark:text-white">{t('navigation.workspaceMenu', 'Workspace Menu')}</h3>
                <p className="text-xs text-slate-500 font-medium">{t('navigation.quickAccessAllFeatures', 'Quick access to all features')}</p>
              </div>
              <button
                type="button"
                onClick={() => setMoreMenuOpen(false)}
                className="p-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                <GoogleIcon name="close" size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2 mt-4">
              {moreMenuItems.map((item) => {
                const isActive = location.pathname.startsWith(item.path);

                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => {
                      setMoreMenuOpen(false);
                      navigate(item.path);
                    }}
                    className={`flex items-center justify-between p-3.5 rounded-2xl transition-all text-left ${
                      isActive 
                        ? 'bg-blue-50 dark:bg-blue-950/50 border border-blue-200/80 dark:border-blue-800/80' 
                        : 'bg-slate-50/80 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-200/60 dark:border-slate-800/60'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className={`p-2.5 rounded-xl ${isActive ? 'bg-blue-600 text-white' : 'bg-slate-200/80 dark:bg-slate-700/80 text-slate-700 dark:text-slate-200'}`}>
                        <GoogleIcon name={item.iconName} size={20} filled={isActive} />
                      </div>
                      <div className="min-w-0">
                        <strong className={`block text-sm font-bold truncate ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-900 dark:text-white'}`}>
                          {item.label}
                        </strong>
                        <span className="text-[11px] text-slate-500 font-medium truncate block">{item.desc}</span>
                      </div>
                    </div>
                    <GoogleIcon name="chevron_right" size={18} className="text-slate-400 shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Primary Mobile Bottom Tab Bar */}
      <nav 
        aria-label="Mobile Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-[90] bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800/80 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1 shadow-2xl no-print"
      >
        <div className="flex items-center justify-around h-12 px-2 max-w-md mx-auto">
          {mainNavItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));

            return (
              <button
                key={item.path}
                type="button"
                onClick={() => {
                  setMoreMenuOpen(false);
                  navigate(item.path);
                }}
                className={`flex flex-col items-center justify-center flex-1 h-full py-1 rounded-xl transition-all duration-200 relative ${
                  isActive 
                    ? 'text-blue-600 dark:text-blue-400 font-bold bg-blue-50/80 dark:bg-blue-950/40 shadow-xs scale-105' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
                }`}
              >
                <GoogleIcon name={item.iconName} size={22} filled={isActive} />
                <span className="text-[10px] font-bold tracking-tight leading-none mt-0.5">{item.label}</span>
                {isActive && (
                  <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-blue-600 dark:bg-blue-400 shadow-sm shadow-blue-500/50" />
                )}
              </button>
            );
          })}

          {/* More Menu Trigger Button */}
          <button
            type="button"
            onClick={() => setMoreMenuOpen(!moreMenuOpen)}
            className={`flex flex-col items-center justify-center flex-1 h-full py-1 rounded-xl transition-all duration-200 relative ${
              isMoreActive || moreMenuOpen
                ? 'text-blue-600 dark:text-blue-400 font-bold bg-blue-50/80 dark:bg-blue-950/40 shadow-xs scale-105' 
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 font-medium'
            }`}
          >
            <GoogleIcon name="grid_view" size={22} filled={isMoreActive || moreMenuOpen} />
            <span className="text-[10px] font-bold tracking-tight leading-none mt-0.5">{t('More', 'More')}</span>
            {(isMoreActive || moreMenuOpen) && (
              <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-5 h-0.5 rounded-full bg-blue-600 dark:bg-blue-400 shadow-sm shadow-blue-500/50" />
            )}
          </button>
        </div>
      </nav>
    </>
  );
}
