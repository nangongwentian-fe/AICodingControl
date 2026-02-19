import type { AntdIconName, PageMenuIcon, PageMenuValue } from './types';
import { Segmented } from 'antd';
import { memo, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Icon } from '@iconify/react';
import {
  FileTextOutlined,
  RocketOutlined,
} from '@ant-design/icons';
import { DEFAULT_PAGE, PAGE_MENU_OPTIONS } from './const';

// Ant Design 图标映射表
const iconMap: Record<AntdIconName, React.ReactNode> = {
  FileTextOutlined: <FileTextOutlined />,
  RocketOutlined: <RocketOutlined />,
};

const renderIconNode = (icon?: PageMenuIcon): React.ReactNode => {
  if (!icon) {
    return null;
  }

  switch (icon.type) {
    case 'image':
      return (
        <img
          src={icon.src}
          alt={icon.alt ?? ''}
          style={{ width: 14, height: 14 }}
        />
      );
    case 'iconify':
      return (
        <span style={{ fontSize: 14, display: 'flex', alignItems: 'center' }}>
          <Icon icon={icon.name} width="14" height="14" />
        </span>
      );
    case 'antd':
      return (
        <span style={{ fontSize: 14, display: 'flex', alignItems: 'center' }}>
          {iconMap[icon.name]}
        </span>
      );
    default:
      return null;
  }
};

const PageMenu = memo(() => {
  const navigate = useNavigate();
  const location = useLocation();

  // 从路径中获取当前页面，默认为 rule-sync
  const currentPage = (location.pathname.slice(1) || DEFAULT_PAGE) as PageMenuValue;

  const handleChange = (value: PageMenuValue) => {
    navigate(`/${value}`);
  };

  const options = useMemo(
    () =>
      PAGE_MENU_OPTIONS.map((option) => {
        const iconNode = renderIconNode(option.icon);

        return {
          value: option.value,
          label: iconNode ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {iconNode}
              <span>{option.label}</span>
            </div>
          ) : (
            option.label
          ),
        };
      }),
    []
  );

  return <Segmented options={options} value={currentPage} onChange={handleChange} />;
});

export default PageMenu;
