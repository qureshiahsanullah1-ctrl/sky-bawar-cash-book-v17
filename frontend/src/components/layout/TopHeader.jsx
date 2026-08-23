import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import GoogleIcon from '../GoogleIcon';

export default function TopHeader({ 
  title, 
  onThemeToggle, 
  onPrint, 
  currentUser, 
  onLogout, 
  companyName, 
  companyLogo, 
  theme, 
  onSearchClick, 
  setMobileOpen,
  language,
  setLanguage
}) {
  const { i18n } = useTranslation();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const handleLanguageSwitch = (langName) => {
    const code = langName === 'Pashto' ? 'ps' : langName === 'Dari' ? 'fa' : 'en';
    i18n.changeLanguage(code);
    localStorage.setItem('cashbook_language', langName);
    localStorage.setItem('i18nextLng', code);
    if (setLanguage) setLanguage(langName);
  };

  const currentLang = language || (i18n.language === 'ps' ? 'Pashto' : i18n.language === 'fa' ? 'Dari' : 'English');

  const dateLabel = now.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
  const timeLabel = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });


  return (
    <header className="app-topbar bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200/80 dark:border-slate-800/80 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-4 sticky top-0 z-30 print-only-hide print:hidden no-print transition-colors">
      
      {/* Title & Branch Area */}
      <div className="topbar-title-area flex items-center gap-3 min-w-0">
        <button 
          className="mobile-menu-btn p-2 rounded-xl bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300 md:hidden hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors" 
          onClick={() => setMobileOpen(true)} 
          aria-label="Open menu"
        >
          <GoogleIcon name="menu" size={20} />
        </button>
        
        <div className="header-titles min-w-0">
          <p className="eyebrow text-[10px] font-black uppercase tracking-widest text-amber-500 dark:text-amber-400 mb-0.5 hidden sm:block">
            Professional Business Management
          </p>
          <div className="topbar-title-row flex items-center gap-2.5 min-w-0">
            <h1 className="page-title text-base sm:text-lg font-black text-slate-900 dark:text-slate-100 tracking-tight leading-none truncate">
              {title}
            </h1>
            
            {/* Branch Selector Pill */}
            <div className="branch-dropdown-pill hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold shadow-xs hover:border-amber-500/50 transition-all shrink-0">
              <GoogleIcon name="domain" size={16} className="text-amber-500 dark:text-amber-400 shrink-0" />
              <select className="branch-select-input bg-transparent text-amber-800 dark:text-amber-200 font-bold text-xs focus:outline-none cursor-pointer border-none p-0" aria-label="Branch select filter">
                <option value="consolidated" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">All Branches (Consolidated)</option>
                <option value="branch-a" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Main Branch - Kabul</option>
                <option value="branch-b" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Branch B - Herat</option>
                <option value="branch-c" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">Branch C - Mazar</option>
              </select>
            </div>
          </div>
        </div>
      </div>
      
      {/* Central Global Search Field */}
      <div 
        className="topbar-search hidden md:flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 w-full max-w-md cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-xs" 
        onClick={onSearchClick} 
        role="button" 
        tabIndex={0} 
        onKeyDown={(e) => e.key === 'Enter' && onSearchClick()}
      >
        <GoogleIcon name="search" size={17} className="text-slate-400 shrink-0" />
        <span className="truncate text-slate-500 dark:text-slate-400">Search accounts, transactions, reports...</span>
        <kbd className="px-2 py-0.5 rounded-lg bg-slate-200/80 dark:bg-slate-800 border border-slate-300/50 dark:border-slate-700 text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 shrink-0 ml-auto">
          ⌘K
        </kbd>
      </div>

      {/* Right Action Buttons & Clock */}
      <div className="topbar-actions flex items-center gap-2.5 shrink-0">
        
        {/* Time Chip */}
        <div className="time-chip hidden lg:flex items-center gap-2 px-3 h-10 rounded-xl bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 text-xs shadow-xs shrink-0" aria-label="Current date and time">
          <GoogleIcon name="schedule" size={16} className="text-amber-500 dark:text-amber-400 shrink-0" />
          <span className="time-chip-text flex items-center gap-2">
            <strong className="text-xs font-bold text-slate-800 dark:text-slate-200">{dateLabel}</strong>
            <small className="text-[11px] font-mono font-bold text-amber-600 dark:text-amber-400">{timeLabel}</small>
          </span>
        </div>

        {/* Language Selector Pill */}
        <div className="language-selector-pill flex items-center gap-1.5 px-2.5 h-10 rounded-xl bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800 text-xs font-bold shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition-all shrink-0">
          <GoogleIcon name="translate" size={16} className="text-blue-500 shrink-0" />
          <select 
            value={currentLang} 
            onChange={(e) => handleLanguageSwitch(e.target.value)}
            className="bg-transparent text-slate-800 dark:text-slate-200 font-bold text-xs focus:outline-none cursor-pointer border-none p-0 pr-1"
            aria-label="Language selector"
          >
            <option value="English" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">English</option>
            <option value="Pashto" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">پښتو (Pashto)</option>
            <option value="Dari" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">دری (Dari)</option>
          </select>
        </div>

        {/* Action Buttons (100% Equal Height & Icon Size) */}
        <div className="topbar-buttons flex items-center gap-1.5 sm:gap-2">

          <button 
            type="button"
            className="w-10 h-10 rounded-xl flex md:hidden items-center justify-center bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-200 transition-all shadow-xs shrink-0 active:scale-95" 
            onClick={onSearchClick} 
            aria-label="Search" 
            title="Search"
          >
            <GoogleIcon name="search" size={18} className="text-slate-700 dark:text-slate-200" />
          </button>

          <button 
            type="button"
            className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-200 transition-all shadow-xs shrink-0 active:scale-95" 
            onClick={onThemeToggle} 
            aria-label="Toggle theme" 
            title="Toggle theme"
          >
            {theme === 'dark' ? <GoogleIcon name="light_mode" size={18} className="text-amber-400" filled /> : <GoogleIcon name="dark_mode" size={18} className="text-slate-700" filled />}
          </button>
          
          <button 
            type="button"
            className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 text-slate-700 dark:text-slate-200 transition-all shadow-xs shrink-0 active:scale-95" 
            onClick={onPrint} 
            aria-label="Print" 
            title="Print studio"
          >
            <GoogleIcon name="print" size={18} className="text-slate-700 dark:text-slate-200" />
          </button>
        </div>
      </div>

    </header>
  );
}
