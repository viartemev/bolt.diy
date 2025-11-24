import { useStore } from '@nanostores/react';
import { menuStore } from '~/lib/stores/menu';
import { classNames } from '~/utils/classNames';

export function HeaderMenuButtons() {
  const menu = useStore(menuStore);

  const toggleMenu = () => {
    menuStore.setKey('open', !menu.open);
  };

  const openSettings = () => {
    menuStore.setKey('isSettingsOpen', true);
    menuStore.setKey('open', false);
  };

  return (
    <div className="flex items-center gap-1 ml-2">
      <button
        onClick={toggleMenu}
        className={classNames(
          'header-menu-button flex items-center justify-center',
          'w-8 h-8 rounded-md',
          'text-gray-600 dark:text-gray-400',
          'hover:text-bolt-elements-textPrimary hover:bg-bolt-elements-item-backgroundActive/10',
          'transition-colors',
          menu.open && 'bg-bolt-elements-item-backgroundActive/10 text-bolt-elements-textPrimary',
        )}
        aria-label="Toggle menu"
        aria-pressed={menu.open}
      >
        <div className="i-ph:list-bold text-xl" />
      </button>
      <button
        onClick={openSettings}
        className={classNames(
          'flex items-center justify-center',
          'w-8 h-8 rounded-md',
          'text-gray-600 dark:text-gray-400',
          'hover:text-bolt-elements-textPrimary hover:bg-bolt-elements-item-backgroundActive/10',
          'transition-colors',
          menu.isSettingsOpen && 'bg-bolt-elements-item-backgroundActive/10 text-bolt-elements-textPrimary',
        )}
        aria-label="Settings"
      >
        <div className="i-ph:gear text-xl" />
      </button>
    </div>
  );
}
