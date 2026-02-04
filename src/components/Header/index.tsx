import { Typography } from 'antd';
import { memo } from 'react';
import PageMenu from './PageMenu';

interface HeaderProps {
  className?: string;
}

const Header = memo<HeaderProps>(({ className }) => {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      {/* 左侧：标题 */}
      <Typography.Title level={5} className="m-0!">
        AI Coding Control
      </Typography.Title>
      {/* 中间：menu */}
      <PageMenu />
      {/* 右侧：操作按钮 */}
      <div></div>
    </div>
  );
});

export default Header;
