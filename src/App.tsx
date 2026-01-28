import { memo } from 'react';
import WindowHeader from './components/WindowHeader';
import './App.module.scss';
import MainContent from './layouts/MainContent';

const App = memo(() => {
  return (
    <div className="flex h-screen flex-col bg-gray-50">
      {/* 窗体Header */}
      <WindowHeader />
      {/* Main content */}
      <MainContent />
    </div>
  );
});

export default App;
