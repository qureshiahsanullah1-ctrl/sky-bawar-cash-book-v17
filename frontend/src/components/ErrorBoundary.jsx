import React from 'react';
import { withTranslation } from 'react-i18next';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    const isChunkError =
      error?.name === 'ChunkLoadError' ||
      /failed to fetch dynamically imported module/i.test(error?.message || '') ||
      /error loading dynamically imported module/i.test(error?.message || '') ||
      /importing a module script failed/i.test(error?.message || '') ||
      /loading chunk [\d]+ failed/i.test(error?.message || '');

    return { hasError: true, error, isChunkError };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an unhandled rendering crash:", error, errorInfo);
    
    const isChunkError =
      error?.name === 'ChunkLoadError' ||
      /failed to fetch dynamically imported module/i.test(error?.message || '') ||
      /error loading dynamically imported module/i.test(error?.message || '') ||
      /importing a module script failed/i.test(error?.message || '') ||
      /loading chunk [\d]+ failed/i.test(error?.message || '');

    if (isChunkError) {
      const lastReload = Number(sessionStorage.getItem('last_error_boundary_reload') || '0');
      if (Date.now() - lastReload > 10000) {
        sessionStorage.setItem('last_error_boundary_reload', String(Date.now()));
        console.warn('New deployment detected. Auto-refreshing app to load latest bundle...');
        window.location.reload();
        return;
      }
    }

    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo);
      } catch (e) {
        // ignore callback error
      }
    }
  }


  componentDidUpdate(prevProps) {
    if (this.state.hasError && this.props.resetKey !== prevProps.resetKey) {
      this.setState({ hasError: false, error: null });
    }
  }

  handleRefresh = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleResetAndGoHome = () => {
    try {
      localStorage.removeItem('cached_summary');
      localStorage.removeItem('cached_transactions');
      localStorage.removeItem('cached_accounts');
    } catch {
      // ignore
    }
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  render() {
    const t = this.props.t || ((key, def) => def || key);

    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isDev = import.meta.env?.DEV || import.meta.env?.MODE === 'development';

      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg, #09090b)',
          color: 'var(--text, #fafafa)',
          fontFamily: 'Inter, system-ui, sans-serif',
          padding: '24px',
          boxSizing: 'border-box'
        }}>
          <div style={{
            maxWidth: '480px',
            width: '100%',
            background: 'var(--surface, rgba(9, 9, 11, 0.8))',
            border: '1px solid var(--border, rgba(39, 39, 42, 0.5))',
            borderRadius: '16px',
            padding: '40px 32px',
            textAlign: 'center',
            boxShadow: 'var(--shadow-lg, 0 8px 32px rgba(0,0,0,0.4))',
            backdropFilter: 'blur(16px)',
            webkitBackdropFilter: 'blur(16px)',
            animation: 'fade-in 0.4s ease-out'
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: 'var(--danger, #ef4444)',
              marginBottom: '24px'
            }}>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" style={{ width: '32px', height: '32px' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>

            <h1 style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              marginBottom: '12px',
              letterSpacing: '-0.025em',
              color: 'var(--text, #fafafa)',
              lineHeight: '1.2'
            }}>
              {this.state.isChunkError
                ? t('errorBoundary.updateAvailable', 'New Version Available / نوې بڼه شتون لري')
                : t('errorBoundary.somethingWentWrong', 'Something went wrong')}
            </h1>
            
            <p style={{
              fontSize: '0.9rem',
              lineHeight: '1.5',
              color: 'var(--text-soft, #a1a1aa)',
              marginBottom: '32px'
            }}>
              {this.state.isChunkError
                ? t('errorBoundary.updateDesc', 'A new software update is available. Click below to load the latest features.')
                : t('errorBoundary.sectionCouldNotBeDisplayed', 'This section could not be displayed. Try again or refresh the application.')}
            </p>


            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>

              <button
                type="button"
                onClick={this.handleRefresh}
                className="error-btn-primary"
                style={{
                  background: 'var(--accent, #4f46e5)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  padding: '12px 24px',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
              >
                {t('errorBoundary.refreshPage', 'Refresh Page')}
              </button>

              <button
                type="button"
                onClick={this.handleResetAndGoHome}
                className="error-btn-secondary"
                style={{
                  background: 'rgba(79, 70, 229, 0.1)',
                  color: '#818cf8',
                  border: '1px solid rgba(79, 70, 229, 0.3)',
                  borderRadius: '10px',
                  padding: '10px 24px',
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {t('errorBoundary.resetWorkspace', 'Reset Workspace & Go Home')}
              </button>
              
              <button
                type="button"
                onClick={this.handleReset}
                className="error-btn-secondary"
                style={{
                  background: 'transparent',
                  color: 'var(--text-soft, #a1a1aa)',
                  border: '1px solid var(--border, rgba(39, 39, 42, 0.4))',
                  borderRadius: '10px',
                  padding: '10px 24px',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {t('errorBoundary.tryAgain', 'Try Again')}
              </button>
            </div>

            {this.state.error && (
              <details open style={{
                marginTop: '20px',
                textAlign: 'left',
                background: 'rgba(239, 68, 68, 0.08)',
                borderRadius: '10px',
                padding: '12px 16px',
                border: '1px solid rgba(239, 68, 68, 0.25)'
              }}>
                <summary style={{
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  color: '#ef4444',
                  outline: 'none'
                }}>
                  {t('errorBoundary.errorDetails', 'Error Details & Stack Trace')}
                </summary>
                <pre style={{
                  fontSize: '0.72rem',
                  overflowX: 'auto',
                  marginTop: '8px',
                  color: '#f87171',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace',
                  maxHeight: '200px'
                }}>
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack ? `\n\nComponent Stack:${this.state.errorInfo.componentStack}` : ''}
                </pre>
              </details>
            )}
          </div>
          
          <style>{`
            @keyframes fade-in {
              from { opacity: 0; transform: scale(0.98); }
              to { opacity: 1; transform: scale(1); }
            }
            .error-btn-primary:hover {
              filter: brightness(1.1);
            }
            .error-btn-secondary:hover {
              background: var(--surface-hover, rgba(39, 39, 42, 0.4)) !important;
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}

export default withTranslation()(ErrorBoundary);

