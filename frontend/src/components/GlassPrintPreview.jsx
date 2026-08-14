import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Building2,
  CheckCircle2,
  DatabaseBackup,
  Download,
  Factory,
  FileDown,
  LogOut,
  Moon,
  Printer,
  Settings,
  ShieldCheck,
  ZoomIn,
  ZoomOut,
  Loader2,
  FileText
} from 'lucide-react';
import PrintDocument from './PrintDocument';
import { useCompany } from '../context/CompanyContext';

function DashboardHeader({ report, onClose }) {
  const { t } = useTranslation();
  const now = new Date();
  return (
    <header className="no-print flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white/70 dark:bg-slate-900/80 backdrop-blur-xl p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 rounded-md border border-blue-200/60 dark:border-blue-800/60">
            {t('print.documentStudio') || 'DOCUMENT STUDIO'}
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          {t('print.printPreviewCenter') || 'Print Preview Center'}
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          {t('print.brandingSystemSubtitle') || 'Professional Document Management & Company Branding System'}
        </p>
      </div>

      {/* Frosted Glass Toolbar Container */}
      <div className="flex flex-wrap items-center gap-3 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-sm self-start lg:self-auto">
        <div className="flex items-center gap-2 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-200/60 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{t('print.systemOnline') || 'System Online'}</span>
        </div>

        <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-700 hidden sm:block" />

        <div className="flex flex-col">
          <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{t('print.currentUser') || 'CURRENT USER'}</span>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{report.preparedBy || 'Ahsanullah Qureshi'}</span>
        </div>

        <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-700 hidden sm:block" />

        <div className="flex flex-col">
          <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{t('print.dateLabel') || 'DATE'}</span>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{now.toLocaleDateString()}</span>
        </div>

        <div className="h-5 w-[1px] bg-slate-200 dark:bg-slate-700 hidden sm:block" />

        <div className="flex flex-col">
          <span className="text-[9.5px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{t('print.timeLabel') || 'TIME'}</span>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>

        <button
          className="p-1.5 ml-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          onClick={onClose}
          aria-label="Close print preview"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}

function BusinessOverview({ report }) {
  const { t } = useTranslation();
  const { currentCompany } = useCompany();
  const activeCompName = report.company?.companyName || currentCompany?.name || 'BAWAR STAR PLASTIC INDUSTRY';
  const cards = [
    { icon: Building2, title: t('print.companyLabel') || 'COMPANY', value: activeCompName },
    { icon: Factory, title: t('print.industryLabel') || 'INDUSTRY', value: t('print.industryValue') || 'Plastic Manufacturing' },
    { icon: ShieldCheck, title: t('print.administratorLabel') || 'ADMINISTRATOR', value: report.preparedBy || 'Ahsanullah Qureshi' },
    { icon: CheckCircle2, title: t('print.printStatusLabel') || 'PRINT STATUS', value: t('print.printStatusValue') || 'Ready for A4 output' }
  ];

  return (
    <div className="no-print grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(({ icon: Icon, title, value }) => (
        <div
          key={title}
          className="bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex items-center gap-4 group"
        >
          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform flex-shrink-0">
            <Icon size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-[11px] font-semibold tracking-wider text-slate-400 dark:text-slate-400 uppercase mb-1">
              {title}
            </span>
            <strong className="block text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
              {value}
            </strong>
          </div>
        </div>
      ))}
    </div>
  );
}

function PrintWorkspace({ report, zoom, status, error, documentRef, onRetry, setZoom, onPrint }) {
  const { t } = useTranslation();
  const documentReady = (status === 'ready' || status === 'printing') && report;

  return (
    <div className="bg-slate-900/5 dark:bg-slate-950/60 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 flex flex-col items-center shadow-inner relative min-h-[600px] w-full">
      {/* Document Staging Framing Toolbar */}
      <div className="no-print w-full flex flex-wrap items-center justify-between gap-3 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md px-4 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-sm mb-6">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <FileText size={16} className="text-blue-600 dark:text-blue-400" />
          <span>A4 Document Preview Sheet</span>
          <span className="text-slate-400 dark:text-slate-500">•</span>
          <span className="text-slate-500 dark:text-slate-400 font-mono">Page 1 of 1</span>
        </div>

        <div className="flex items-center gap-3">
          {/* Zoom Controls */}
          <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-mono">
            <button
              onClick={() => setZoom(Math.max(0.70, Number((zoom - 0.05).toFixed(2))))}
              className="p-1 hover:bg-white dark:hover:bg-slate-800 rounded transition-colors text-slate-600 dark:text-slate-300"
              title="Zoom out"
            >
              <ZoomOut size={14} />
            </button>
            <span className="w-10 text-center font-bold text-slate-800 dark:text-slate-200">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom(Math.min(1.1, Number((zoom + 0.05).toFixed(2))))}
              className="p-1 hover:bg-white dark:hover:bg-slate-800 rounded transition-colors text-slate-600 dark:text-slate-300"
              title="Zoom in"
            >
              <ZoomIn size={14} />
            </button>
          </div>

          <button
            onClick={onPrint}
            disabled={status !== 'ready'}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
          >
            <Printer size={14} />
            <span>Print Now / Export PDF</span>
          </button>
        </div>
      </div>

      {status === 'loading' && (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-3" role="status">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <strong className="text-sm font-bold text-slate-800 dark:text-slate-200">{t('print.preparingReport') || 'Preparing Report Sheet...'}</strong>
          <p className="text-xs text-slate-500">{t('print.loadingAssets') || 'Loading high-fidelity document assets...'}</p>
        </div>
      )}

      {status === 'error' && (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-3 bg-red-50 dark:bg-red-950/30 p-6 rounded-xl border border-red-200 dark:border-red-900/50" role="alert">
          <strong className="text-red-700 dark:text-red-400 font-bold text-sm">{t('print.errorPreparing') || 'Failed to render print preview'}</strong>
          <p className="text-xs text-red-600 dark:text-red-300">{error}</p>
          <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors" type="button" onClick={onRetry}>{t('print.tryAgain') || 'Try Again'}</button>
        </div>
      )}

      {documentReady && (
        <div className="w-full flex justify-center overflow-x-auto py-2">
          <div className="shadow-2xl shadow-slate-900/20 dark:shadow-black/70 rounded-xl border border-slate-200/80 dark:border-slate-800 transition-all transform origin-top bg-white" style={{ transform: `scale(${zoom})` }}>
            <PrintDocument report={report} documentRef={documentRef} zoom={1} />
          </div>
        </div>
      )}
    </div>
  );
}

function ActionDock({ onPrint, onThemeToggle, onDownloadData, onSettings, onLogout, onClose, onDownloadPng, zoom, setZoom, printDisabled, pngLoading }) {
  const { t } = useTranslation();
  const actions = [
    { label: t('print.dockPrint') || 'Print', icon: Printer, tone: 'blue', onClick: onPrint, disabled: printDisabled || pngLoading },
    { label: t('print.dockExportPdf') || 'Export PDF', icon: FileDown, tone: 'green', onClick: onPrint, disabled: printDisabled || pngLoading },
    { label: pngLoading ? (t('print.exporting') || 'Exporting...') : (t('print.dockExportPng') || 'Export PNG'), icon: pngLoading ? Loader2 : Download, tone: 'purple', onClick: onDownloadPng, disabled: printDisabled || pngLoading },
    { label: t('print.dockDownload') || 'Download Data', icon: DatabaseBackup, tone: 'cyan', onClick: onDownloadData, disabled: pngLoading },
    { label: t('print.dockTheme') || 'Theme', icon: Moon, tone: 'glass', onClick: onThemeToggle, disabled: pngLoading },
    { label: t('print.dockSettings') || 'Settings', icon: Settings, tone: 'glass', onClick: onSettings, disabled: pngLoading },
    { label: t('print.dockLogout') || 'Close', icon: LogOut, tone: 'red', onClick: onLogout || onClose, disabled: pngLoading }
  ];

  return (
    <div className="no-print flex flex-wrap items-center justify-between gap-3 bg-white/80 dark:bg-slate-900/90 backdrop-blur-xl p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm mt-4">
      <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-mono">
        <button onClick={() => setZoom(Math.max(0.70, Number((zoom - 0.05).toFixed(2))))} className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded transition-colors text-slate-600 dark:text-slate-300" aria-label="Zoom out"><ZoomOut size={16} /></button>
        <span className="w-12 text-center font-bold text-slate-800 dark:text-slate-200">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(Math.min(1.1, Number((zoom + 0.05).toFixed(2))))} className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded transition-colors text-slate-600 dark:text-slate-300" aria-label="Zoom in"><ZoomIn size={16} /></button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {actions.map(({ label, icon: Icon, tone, onClick, disabled }) => (
          <button
            key={label}
            className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              tone === 'blue' ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm' :
              tone === 'green' ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm' :
              tone === 'purple' ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm' :
              tone === 'cyan' ? 'bg-cyan-600 hover:bg-cyan-700 text-white shadow-sm' :
              tone === 'red' ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/60 border border-red-200 dark:border-red-800/60' :
              'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
            onClick={() => onClick?.()}
            disabled={disabled}
          >
            <Icon size={16} className={Icon === Loader2 ? 'animate-spin' : ''} />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function GlassPrintPreview({
  open,
  onClose,
  report,
  onPrint,
  onThemeToggle,
  onDownloadData,
  onSettings,
  onLogout,
  status,
  error,
  onRetry,
  documentRef
}) {
  const [zoom, setZoom] = useState(0.86);
  const [pngLoading, setPngLoading] = useState(false);
  const [pngError, setPngError] = useState('');

  if (!open) return null;

  const downloadPng = async () => {
    if (!documentRef?.current) return;
    setPngLoading(true);
    setPngError('');
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(documentRef.current, {
        backgroundColor: 'var(--surface, #ffffff)',
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left'
        },
        cacheBust: true
      });
      
      const link = document.createElement('a');
      const companyNameClean = (report?.company?.companyName || 'cashbook').toLowerCase().replace(/[^a-z0-9]/g, '_');
      const dateStr = new Date().toISOString().slice(0, 10);
      link.download = `${companyNameClean}_report_${dateStr}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('PNG download error:', err);
      setPngError(err.message || 'Failed to generate PNG image.');
    } finally {
      setPngLoading(false);
    }
  };

  return (
    <div className="print-preview-overlay fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-md p-4 sm:p-6 lg:p-8 flex justify-center items-start">
      <main className="w-full max-w-7xl space-y-5 bg-slate-50/50 dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-2xl">
        <DashboardHeader report={report || { preparedBy: 'Ahsanullah Qureshi' }} onClose={onClose} />
        {report ? <BusinessOverview report={report} /> : null}
        {pngError && (
          <div className="print-preview-state print-preview-error no-print bg-red-50 dark:bg-red-950/30 p-4 rounded-xl border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs" role="alert">
            <strong>PNG Export Failed: </strong>
            <span>{pngError}</span>
          </div>
        )}
        <section className="print-preview-studio w-full">
          <PrintWorkspace
            report={report}
            zoom={zoom}
            setZoom={setZoom}
            onPrint={onPrint}
            status={status}
            error={error}
            documentRef={documentRef}
            onRetry={onRetry}
          />
        </section>
        <ActionDock
          onPrint={onPrint}
          onThemeToggle={onThemeToggle}
          onDownloadData={onDownloadData}
          onSettings={onSettings}
          onLogout={onLogout}
          onClose={onClose}
          onDownloadPng={downloadPng}
          zoom={zoom}
          setZoom={setZoom}
          printDisabled={status !== 'ready'}
          pngLoading={pngLoading}
        />
      </main>
    </div>
  );
}
