import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import TopHeader from './TopHeader';
import IosBottomTabNav from '../mobile/IosBottomTabNav';

const SIDEBAR_STORAGE_KEY = 'cashbook-sidebar-collapsed';

function getDefaultSidebarState() {
  try {
    localStorage.removeItem('cashbook_sidebar_collapsed');
    localStorage.removeItem('cashbook_sidebar_user_toggled');

    const stored = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    const width = window.innerWidth;
    if (width >= 1280) {
      return stored === 'true';
    }
    return true; // Always default collapsed on tablet & mobile (<1280px)
  } catch {
    return true;
  }
}

export default function AppShell({ 
  children, 
  activeView, 
  setView, 
  companyName, 
  title, 
  onThemeToggle, 
  onPrint, 
  onBackup,
  onRestore,
  currentUser, 
  onLogout, 
  companyLogo, 
  theme, 
  onSearchClick 
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(getDefaultSidebarState);

  const handleSetIsCollapsed = (collapsed) => {
    setIsCollapsed(collapsed);
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed));
    } catch (e) {
      console.warn('Unable to persist sidebar state:', e);
    }
  };

  return (
    <div className={`app-shell ${isCollapsed ? 'sidebar-collapsed' : 'sidebar-expanded'} print:p-0 print:m-0 print:w-full print:bg-white w-full max-w-full min-w-0 overflow-x-hidden`}>
      <Sidebar 
        activeView={activeView} 
        setView={setView} 
        mobileOpen={mobileOpen} 
        setMobileOpen={setMobileOpen}
        isCollapsed={isCollapsed}
        setIsCollapsed={handleSetIsCollapsed}
        companyName={companyName}
        companyLogo={companyLogo}
        currentUser={currentUser}
        onPrint={onPrint}
        onBackup={onBackup}
        onRestore={onRestore}
        onLogout={onLogout}
      />
      
      <div className="app-workspace print:p-0 print:m-0 print:w-full print:block flex-1 w-full min-w-0 max-w-full overflow-x-hidden">
        <TopHeader 
          title={title}
          onThemeToggle={onThemeToggle}
          onPrint={onPrint}
          currentUser={currentUser}
          onLogout={onLogout}
          companyName={companyName}
          companyLogo={companyLogo}
          theme={theme}
          onSearchClick={onSearchClick}
          setMobileOpen={setMobileOpen}
          isCollapsed={isCollapsed}
        />
        
        <main className="app-main-scroll pb-16 md:pb-0 print:p-0 print:m-0 print:w-full print:block print:overflow-visible w-full min-w-0 max-w-full overflow-x-hidden">
          {children || <Outlet />}
        </main>
      </div>

      {/* iOS Mobile Bottom Navigation Bar */}
      <IosBottomTabNav />
    </div>
  );
}

