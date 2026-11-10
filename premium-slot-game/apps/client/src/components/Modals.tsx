import { useUiStore } from '../stores/uiStore';
import { AutoSpinModal } from './AutoSpinModal';
import { HistoryModal } from './HistoryModal';
import { InfoModal } from './InfoModal';
import { MenuModal } from './MenuModal';
import { PaytableModal } from './PaytableModal';
import { SettingsModal } from './SettingsModal';

export function Modals() {
  const modal = useUiStore((s) => s.modal);
  switch (modal) {
    case 'paytable':
      return <PaytableModal />;
    case 'settings':
      return <SettingsModal />;
    case 'history':
      return <HistoryModal />;
    case 'info':
      return <InfoModal />;
    case 'menu':
      return <MenuModal />;
    case 'auto':
      return <AutoSpinModal />;
    default:
      return null;
  }
}
