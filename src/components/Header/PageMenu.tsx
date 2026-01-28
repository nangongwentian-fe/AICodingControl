import { memo } from 'react';
import { Segmented } from 'antd';
import { useNavigate, useLocation } from 'react-router';
import { PAGE_MENU_OPTIONS, DEFAULT_PAGE } from './const';
import type { PageMenuValue } from './types';

const PageMenu = memo(() => {
  const navigate = useNavigate();
  const location = useLocation();

  // 从路径中获取当前页面，默认为 rule-sync
  const currentPage = (location.pathname.slice(1) || DEFAULT_PAGE) as PageMenuValue;

  const handleChange = (value: PageMenuValue) => {
    navigate(`/${value}`);
  };

  return <Segmented options={PAGE_MENU_OPTIONS} value={currentPage} onChange={handleChange} />;
});

export default PageMenu;
