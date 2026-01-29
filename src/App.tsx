import { memo, Suspense } from 'react';
import { BrowserRouter, useRoutes } from 'react-router';
import Header from './components/Header';
import WindowHeader from './components/WindowHeader';
import { routes } from './router/routes';
import './App.module.scss';

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
        <div className="flex-1 p-4">
          <Header className="mb-4" />
          <AppRoutes />
        </div>
      </div>
    </BrowserRouter>
  );
});

export default App;
