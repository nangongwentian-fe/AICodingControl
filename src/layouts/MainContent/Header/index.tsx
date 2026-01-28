import { memo } from 'react';
import { Typography } from 'antd';

const Header = memo(() => {
  return (
    <div className="flex items-center justify-between">
      {/* 左侧：标题 */}
      <div>
        <Typography.Title level={5} className="m-0!">
          AI Coding Control
        </Typography.Title>
      </div>
      {/* 中间：menu */}
      <div></div>
      {/* 右侧：操作按钮 */}
      <div></div>
    </div>
  );
});

export default Header;
