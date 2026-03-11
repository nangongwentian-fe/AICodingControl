import type { PageMenuIcon } from './types';
import { Icon } from '@iconify/react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';
import { DEFAULT_PAGE, NAV_ITEMS } from './nav-data';
import { LanguageSwitcher } from './LanguageSwitcher';

function renderIcon(icon?: PageMenuIcon): React.ReactNode {
  if (!icon) return null;

  switch (icon.type) {
    case 'image':
      return <img src={icon.src} alt={icon.alt ?? ''} className="size-4" />;
    case 'iconify':
      return <Icon icon={icon.name} width={18} height={18} />;
    default:
      return null;
  }
}

export function AppSidebar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { isMobile, setOpenMobile } = useSidebar();
  const currentPage = location.pathname.slice(1) || DEFAULT_PAGE;

  const handleNavigate = (page: string) => {
    navigate(`/${page}`);
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar collapsible="icon" topOffset="var(--window-header-height)" className="border-r">
      <SidebarHeader className="px-3 py-4">
        <div className="flex items-center gap-2 overflow-hidden">
          <Icon icon="mdi:robot-outline" width={22} height={22} className="shrink-0 text-primary" />
          <span className="truncate text-sm font-semibold">{t('header.appTitle')}</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.value}>
                  <SidebarMenuButton
                    isActive={currentPage === item.value}
                    onClick={() => handleNavigate(item.value)}
                    tooltip={t(item.labelKey)}
                  >
                    {renderIcon(item.icon)}
                    <span>{t(item.labelKey)}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-2 pb-3">
        <LanguageSwitcher />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
