import type { AppLanguage } from '@/i18n/types';
import { memo, Suspense, useMemo } from 'react';
import { ConfigProvider, Layout } from 'antd';
import type { Locale } from 'antd/es/locale';
import enUS from 'antd/locale/en_US';
import zhCN from 'antd/locale/zh_CN';
import { useTranslation } from 'react-i18next';
import { HashRouter, useRoutes } from 'react-router';
import Header from './components/Header';
import WindowHeader from './components/WindowHeader';
import { routes } from './router/routes';
import './App.module.scss';

interface AppRoutesProps {
  loadingText: string;
}

const ANTD_LOCALE_MAP: Record<AppLanguage, Locale> = {
  'zh-CN': zhCN,
  'en-US': enUS,
};

const AppRoutes = memo<AppRoutesProps>(({ loadingText }) => {
  const element = useRoutes(routes);
  return <Suspense fallback={<div>{loadingText}</div>}>{element}</Suspense>;
});

const App = memo(() => {
  const { t, i18n } = useTranslation();
  const locale = useMemo(() => {
    const language = (i18n.resolvedLanguage ?? i18n.language ?? '').toLowerCase();
    const normalizedLanguage: AppLanguage = language.startsWith('en') ? 'en-US' : 'zh-CN';
    return ANTD_LOCALE_MAP[normalizedLanguage];
  }, [i18n.language, i18n.resolvedLanguage]);

  return (
    <ConfigProvider locale={locale}>
      <HashRouter>
        <div className="flex h-screen flex-col bg-gray-50">
          {/* 窗体Header - 防止被内容挤压 */}
          <div className="shrink-0">
            <WindowHeader />
          </div>
          {/* Main content */}
          <Layout.Content className="flex-1 min-h-0 flex flex-col p-4">
            {/* Header 固定不滚动 */}
            <Header className="mb-4 shrink-0" />
            {/* 内容区域可滚动 */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              <AppRoutes loadingText={t('common.loading')} />
            </div>
          </Layout.Content>
        </div>
      </HashRouter>
    </ConfigProvider>
  );
});

export default App;
