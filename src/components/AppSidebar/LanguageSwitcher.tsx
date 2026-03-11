import type { AppLanguage } from '@/i18n/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { useSidebar } from '@/components/ui/sidebar';

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const { open } = useSidebar();
  const language = (i18n.resolvedLanguage ?? i18n.language ?? '').toLowerCase();
  const currentLanguage: AppLanguage = language.startsWith('en') ? 'en-US' : 'zh-CN';

  const handleLanguageChange = (lang: AppLanguage) => {
    void i18n.changeLanguage(lang);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className={cn('w-full justify-start gap-2', !open && 'justify-center px-0')}>
          <Icon icon="mdi:translate" width={18} height={18} />
          {open && <span>{currentLanguage === 'zh-CN' ? t('header.languageZhCN') : t('header.languageEnUS')}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="end">
        <DropdownMenuItem
          onClick={() => handleLanguageChange('zh-CN')}
          className={cn(currentLanguage === 'zh-CN' && 'bg-accent')}
        >
          {t('header.languageZhCN')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleLanguageChange('en-US')}
          className={cn(currentLanguage === 'en-US' && 'bg-accent')}
        >
          {t('header.languageEnUS')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
