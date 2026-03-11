import { memo, Suspense, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { HashRouter, useLocation, useRoutes } from 'react-router';
import { Toaster } from 'sonner';
import { AppSidebar } from './components/AppSidebar';
import { DEFAULT_PAGE, NAV_ITEMS } from './components/AppSidebar/nav-data';
import { SidebarInset, SidebarProvider, SidebarTrigger } from './components/ui/sidebar';
import { TooltipProvider } from './components/ui/tooltip';
import WindowHeader from './components/WindowHeader';
import { routes } from './router/routes';

interface AppRoutesProps {
  loadingText: string;
}

const AppRoutes = memo<AppRoutesProps>(({ loadingText }) => {
  const element = useRoutes(routes);
  return <Suspense fallback={<div className="flex items-center justify-center py-12 text-muted-foreground">{loadingText}</div>}>{element}</Suspense>;
});

const AppShell = memo(() => {
  const { t } = useTranslation();
  const location = useLocation();
  const platform = window.electronAPI?.platform ?? 'unknown';
  const isMac = platform === 'darwin';
  const currentPage = location.pathname.slice(1) || DEFAULT_PAGE;
  const currentNavItem = NAV_ITEMS.find((item) => item.value === currentPage) ?? NAV_ITEMS[0];
  const pageTitle = t(currentNavItem.labelKey);
  const headerHeight = isMac ? '32px' : '44px';

  return (
    <div
      className="flex h-screen flex-col overflow-hidden"
      style={{ '--window-header-height': headerHeight } as CSSProperties}
    >
      <WindowHeader />

      <SidebarProvider defaultOpen className="min-h-0 flex-1 overflow-hidden">
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <AppSidebar />
          <SidebarInset className="flex-1 min-h-0 flex flex-col">
            <header className="flex h-14 shrink-0 items-center justify-between border-b bg-background/88 px-4 backdrop-blur-md">
              <div className="flex min-w-0 items-center gap-3">
                <SidebarTrigger className="-ml-1" />
                <div className="h-5 w-px bg-border" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{pageTitle}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {isMac ? t('header.appTitle') : t('header.workspaceLabel')}
                  </p>
                </div>
              </div>
            </header>
            <div className="flex-1 min-h-0 overflow-y-auto p-4">
              <AppRoutes loadingText={t('common.loading')} />
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </div>
  );
});

const App = memo(() => {
  return (
    <TooltipProvider>
      <HashRouter>
        <AppShell />
        <Toaster position="top-center" richColors />
      </HashRouter>
    </TooltipProvider>
  );
});

export default App;
