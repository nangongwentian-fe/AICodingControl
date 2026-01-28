import { memo } from 'react';
import Header from './Header';

const MainContent = memo(() => {
  return (
    <div className="flex-1 p-4">
      <Header />
    </div>
  );
});

export default MainContent;
