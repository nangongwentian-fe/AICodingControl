import { memo, Suspense } from 'react';
import { BrowserRouter, useRoutes } from 'react-router';
import Header from './components/Header';
import WindowHeader from './components/WindowHeader';
import { routes } from './router/routes';
import './App.module.scss';
import { Layout } from 'antd';

const AppRoutes = memo(() => {
  const element = useRoutes(routes);
  return <Suspense fallback={<div>加载中...</div>}>{element}</Suspense>;
});

const App = memo(() => {
  return (
    <BrowserRouter>
      <div className="flex h-screen flex-col bg-gray-50">
        {/* 窗体Header */}
        <WindowHeader />
        {/* Main content */}
        <Layout.Content className="flex-1 min-h-0 overflow-y-auto p-4">
          <Header className="mb-4" />
          <AppRoutes />
        </Layout.Content>
      </div>
    </BrowserRouter>
  );
});

export default App;
