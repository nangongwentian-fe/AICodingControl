import type { PageMenuValue } from './types';
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
const iconMap: Record<string, React.ReactNode> = {
  FileTextOutlined: <FileTextOutlined />,
  RocketOutlined: <RocketOutlined />,
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
        let iconNode: React.ReactNode = null;

        // 处理 SVG 图片图标
        if (typeof option.icon === 'string' && option.icon.endsWith('.svg')) {
          iconNode = (
            <img
              src={option.icon}
              alt=""
              style={{ width: 14, height: 14 }}
            />
          );
        }
        // 处理 Iconify 图标 (格式: iconify:图标集:图标名)
        else if (typeof option.icon === 'string' && option.icon.startsWith('iconify:')) {
          const iconName = option.icon.replace('iconify:', '');
          iconNode = (
            <span style={{ fontSize: 14, display: 'flex', alignItems: 'center' }}>
              <Icon icon={iconName} width="14" height="14" />
            </span>
          );
        }
        // 处理 Ant Design 图标名称
        else if (typeof option.icon === 'string' && iconMap[option.icon]) {
          iconNode = (
            <span style={{ fontSize: 14, display: 'flex', alignItems: 'center' }}>
              {iconMap[option.icon]}
            </span>
          );
        }

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
