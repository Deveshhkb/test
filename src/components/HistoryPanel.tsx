import { Modal } from '@/ui/Modal';
import { useGameStore } from '@/store/gameStore';
import { formatCredits } from '@/utils/format';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function HistoryPanel({ open, onClose }: Props) {
  const history = useGameStore((s) => s.history);

  return (
    <Modal title="Spin History" open={open} onClose={onClose}>
      {history.length === 0 ? (
        <p className="hint">No spins yet — good luck!</p>
      ) : (
        <table className="history-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Type</th>
              <th>Bet</th>
              <th>Win</th>
            </tr>
          </thead>
          <tbody>
            {history.map((h) => (
              <tr key={h.id} className={h.win > 0 ? 'win-row' : ''}>
                <td>{new Date(h.timestamp).toLocaleTimeString()}</td>
                <td>{h.isFreeSpin ? 'Free spin' : 'Spin'}</td>
                <td>{formatCredits(h.bet)}</td>
                <td>{h.win > 0 ? `+${formatCredits(h.win)}` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Modal>
  );
}
