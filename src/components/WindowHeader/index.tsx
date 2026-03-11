import * as React from 'react';
import { Icon } from '@iconify/react';
import { Minus, Square, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import styles from './index.module.scss';

const WindowHeader: React.FC = () => {
  const { t } = useTranslation();
  const platform = window.electronAPI?.platform ?? 'unknown';
  const isMac = platform === 'darwin';
  const showWindowControls = platform === 'win32' || platform === 'linux';

  const handleDoubleClick = () => {
    if (!isMac) {
      window.electronAPI?.maximizeWindow?.();
    }
  };

  return (
    <header className={cn(styles.customHeader, isMac && styles.macHeader)} onDoubleClick={handleDoubleClick}>
      {isMac ? (
        <div className={styles.macTrafficLightSpacer} />
      ) : (
        <div className={styles.brandBlock}>
          <span className={styles.brandIcon}>
            <Icon icon="mdi:robot-outline" width={16} height={16} />
          </span>
          <span className={styles.brandTitle}>{t('header.appTitle')}</span>
        </div>
      )}

      <div className={styles.dragRegion} />

      <div className={styles.windowActions}>
        {showWindowControls ? (
          <>
            <Button
              variant="ghost"
              size="icon-sm"
              className={styles.windowActionButton}
              onClick={() => window.electronAPI?.minimizeWindow?.()}
              aria-label="Minimize window"
            >
              <Minus />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className={styles.windowActionButton}
              onClick={() => window.electronAPI?.maximizeWindow?.()}
              aria-label="Maximize window"
            >
              <Square />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className={styles.closeButton}
              onClick={() => window.electronAPI?.closeWindow?.()}
              aria-label="Close window"
            >
              <X />
            </Button>
          </>
        ) : null}
      </div>
    </header>
  );
};

export default WindowHeader;
