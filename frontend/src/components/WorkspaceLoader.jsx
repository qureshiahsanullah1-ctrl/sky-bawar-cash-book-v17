import React, { useState, useEffect } from 'react';
import { RefreshCw, ShieldCheck, Sparkles, Building2, Server } from 'lucide-react';
import CompanyLogo from './CompanyLogo';

export default function WorkspaceLoader({ 
  message = "Loading workspace...", 
  subtext = "Initializing secure environment & ledger accounts",
  companyName = "BAWAR STAR PLASTIC INDUSTRY",
  companyLogo = null,
  onRetry = null,
  error = null
}) {
  const [dots, setDots] = useState('');
  const [showRetry, setShowRetry] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  const loadingSteps = [
    "Establishing secure server connection...",
    "Verifying session credentials...",
    "Loading ledger accounts & currencies...",
    "Preparing financial workspace..."
  ];

  useEffect(() => {
    const dotsInterval = setInterval(() => {
      setDots(prev => (prev.length >= 3 ? '' : prev + '.'));
    }, 400);

    const stepInterval = setInterval(() => {
      setLoadingStep(prev => (prev + 1) % loadingSteps.length);
    }, 1800);

    // Show retry button after 7 seconds if still loading
    const timer = setTimeout(() => {
      setShowRetry(true);
    }, 7000);

    return () => {
      clearInterval(dotsInterval);
      clearInterval(stepInterval);
      clearTimeout(timer);
    };
  }, []);

  const handleReload = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
      {/* Background Animated Gradient Mesh Spheres */}
      <div className="absolute top-[-15%] left-[-15%] w-[55vw] h-[55vw] rounded-full bg-gradient-to-br from-blue-600/20 via-indigo-600/15 to-teal-500/10 blur-[140px] pointer-events-none animate-pulse" style={{ animationDuration: '6s' }} />
      <div className="absolute bottom-[-15%] right-[-15%] w-[55vw] h-[55vw] rounded-full bg-gradient-to-tl from-indigo-700/20 via-purple-600/15 to-emerald-500/10 blur-[140px] pointer-events-none animate-pulse" style={{ animationDuration: '8s', animationDelay: '2s' }} />
      <div className="absolute top-[30%] left-[30%] w-[40vw] h-[40vw] rounded-full bg-cyan-500/10 blur-[150px] pointer-events-none" />

      {/* Main Glass Card */}
      <div className="relative z-10 w-full max-w-md mx-4 p-8 sm:p-10 rounded-3xl bg-slate-900/80 border border-slate-800/80 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] backdrop-blur-2xl flex flex-col items-center text-center">
        
        {/* Brand Header & Logo */}
        <div className="relative mb-6 flex items-center justify-center">
          <div className="absolute inset-0 rounded-2xl bg-amber-500/20 blur-xl animate-pulse" />
          <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-b from-slate-800 to-slate-900 p-2.5 border border-slate-700/60 shadow-inner flex items-center justify-center">
            {companyLogo ? (
              <img src={companyLogo} alt={companyName} className="w-full h-full object-contain filter drop-shadow" />
            ) : (
              <CompanyLogo className="w-full h-full object-contain filter drop-shadow" />
            )}
          </div>
        </div>

        {/* Company Title */}
        <h2 className="text-xl font-bold tracking-tight text-white mb-1 drop-shadow-sm">
          {companyName}
        </h2>
        <p className="text-xs font-semibold tracking-wider uppercase text-amber-400/90 mb-6 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
          ENTERPRISE CASH BOOK ACCOUNTING
        </p>

        {/* Dynamic Dual Glowing Ring Loader */}
        <div className="relative w-20 h-20 my-4 flex items-center justify-center">
          {/* Outer Pulsing Glow */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-500/20 via-indigo-500/20 to-teal-500/20 blur-md animate-pulse" />
          {/* Outer Spinner */}
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-amber-400 border-r-indigo-500 animate-spin" style={{ animationDuration: '1.2s' }} />
          {/* Inner Reverse Spinner */}
          <div className="absolute inset-2 rounded-full border-2 border-transparent border-b-teal-400 border-l-purple-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.8s' }} />
          {/* Center Icon */}
          <Sparkles className="w-6 h-6 text-amber-300 animate-pulse" />
        </div>

        {/* Primary Message */}
        <div className="mt-4 mb-2">
          <h3 className="text-base font-semibold text-slate-100 flex items-center justify-center gap-1">
            {error ? "Connection Notice" : message}
            {!error && <span className="w-4 text-left font-mono">{dots}</span>}
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xs transition-all duration-300">
            {error ? error : (loadingSteps[loadingStep] || subtext)}
          </p>
        </div>

        {/* Shimmering Animated Progress Bar */}
        <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden my-4 border border-slate-700/40 relative">
          <div 
            className="h-full bg-gradient-to-r from-amber-400 via-teal-400 to-indigo-500 rounded-full animate-pulse transition-all duration-500" 
            style={{ 
              width: error ? '100%' : `${((loadingStep + 1) / loadingSteps.length) * 100}%` 
            }} 
          />
        </div>

        {/* Bottom Footer Info or Retry Button */}
        {(showRetry || error) ? (
          <button
            onClick={handleReload}
            className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-semibold transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer shadow-lg"
          >
            <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '4s' }} />
            {error ? "Retry Connection" : "Taking longer than expected? Refresh Workspace"}
          </button>
        ) : (
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
            <Server className="w-3 h-3 text-slate-400" />
            <span>Encrypted Session • Cloud Sync Active</span>
          </div>
        )}

      </div>
    </div>
  );
}
