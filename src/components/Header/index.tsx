import type { AppLanguage } from '@/i18n/types';
import { Segmented, Typography } from 'antd';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import PageMenu from './PageMenu';

interface HeaderProps {
  className?: string;
}

const Header = memo<HeaderProps>(({ className }) => {
  const { t, i18n } = useTranslation();
  const language = (i18n.resolvedLanguage ?? i18n.language ?? '').toLowerCase();
  const currentLanguage: AppLanguage = language.startsWith('en') ? 'en-US' : 'zh-CN';

  const languageOptions = [
    { label: t('header.languageZhCN'), value: 'zh-CN' },
    { label: t('header.languageEnUS'), value: 'en-US' },
  ];

  const handleLanguageChange = (value: string | number) => {
    void i18n.changeLanguage(value as AppLanguage);
  };

  return (
    <div className={`flex items-center justify-between ${className}`}>
      {/* 左侧：标题 */}
      <Typography.Title level={5} className="m-0!">
        {t('header.appTitle')}
      </Typography.Title>
      {/* 中间：menu */}
      <PageMenu />
      {/* 右侧：操作按钮 */}
      <Segmented
        size="small"
        options={languageOptions}
        value={currentLanguage}
        onChange={handleLanguageChange}
      />
    </div>
  );
});

export default Header;
