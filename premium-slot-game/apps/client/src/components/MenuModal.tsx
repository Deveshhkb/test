import { useUiStore } from '../stores/uiStore';
import { IconHistory, IconInfo, IconSettings, IconTable } from './Icons';
import { Modal } from './Modal';

export function MenuModal() {
  const open = useUiStore((s) => s.open);
  const items = [
    { id: 'paytable' as const, label: 'Paytable', icon: <IconTable /> },
    { id: 'info' as const, label: 'Game rules', icon: <IconInfo /> },
    { id: 'history' as const, label: 'History', icon: <IconHistory /> },
    { id: 'settings' as const, label: 'Settings', icon: <IconSettings /> },
  ];
  return (
    <Modal title="MENU" testId="menu">
      <div className="menu-list">
        {items.map((i) => (
          <button key={i.id} type="button" className="menu-item" data-testid={`menu-${i.id}`} onClick={() => open(i.id)}>
            {i.icon}
            <span>{i.label}</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
